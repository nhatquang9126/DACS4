import { Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { parsePaginationParams, searchFilter, formatPaginatedResponse } from '../utils/pagination';
import { logAdminAction } from '../utils/activityLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /api/admin/ai-monitor/health - Kiểm tra kết nối tới Python FastAPI
export const getAIHealth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const start = Date.now();
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 4000 });
    const latency = Date.now() - start;

    res.status(200).json({
      status: 'ONLINE',
      service_url: AI_SERVICE_URL,
      latency_ms: latency,
      details: response.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(200).json({
      status: 'OFFLINE',
      service_url: AI_SERVICE_URL,
      latency_ms: null,
      error: error.message || 'Không thể kết nối tới AI Microservice',
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/admin/ai-monitor/stats - Thống kê số lượt gọi, tỷ lệ thành công, độ trễ trung bình
export const getAIStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCalls, byFunction, byStatus, avgLatency, recentErrors] = await Promise.all([
      prisma.aILog.count({
        where: { created_at: { gte: sinceDate } },
      }),
      prisma.aILog.groupBy({
        by: ['function_type'],
        _count: { id: true },
        where: { created_at: { gte: sinceDate } },
      }),
      prisma.aILog.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { created_at: { gte: sinceDate } },
      }),
      prisma.aILog.aggregate({
        _avg: { latency_ms: true },
        where: { status: 'SUCCESS', created_at: { gte: sinceDate } },
      }),
      prisma.aILog.findMany({
        where: { status: 'ERROR', created_at: { gte: sinceDate } },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          function_type: true,
          error_message: true,
          latency_ms: true,
          created_at: true,
        },
      }),
    ]);

    const successCount = byStatus.find((s) => s.status === 'SUCCESS')?._count.id || 0;
    const errorCount = byStatus.find((s) => s.status === 'ERROR')?._count.id || 0;
    const successRate = totalCalls > 0 ? Number(((successCount / totalCalls) * 100).toFixed(1)) : 100;

    res.status(200).json({
      period_days: days,
      total_calls: totalCalls,
      success_count: successCount,
      error_count: errorCount,
      success_rate_percent: successRate,
      avg_latency_ms: Math.round(avgLatency._avg.latency_ms || 0),
      by_function: byFunction.map((f) => ({
        function_type: f.function_type,
        count: f._count.id,
      })),
      by_status: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      recent_errors: recentErrors,
    });
  } catch (error) {
    console.error('Lỗi thống kê AI Monitor:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/ai-monitor/risk-distribution - Tỷ lệ phân loại nguy cơ học tập
export const getAIRiskDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalStudents, highCount, mediumCount, lowCount, recentPredictions] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.prediction.count({ where: { risk_level: 'HIGH' } }),
      prisma.prediction.count({ where: { risk_level: 'MEDIUM' } }),
      prisma.prediction.count({ where: { risk_level: 'LOW' } }),
      prisma.prediction.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { user: { select: { id: true, email: true } } },
      }),
    ]);

    const totalPredicted = highCount + mediumCount + lowCount;
    const calcPct = (count: number) =>
      totalPredicted > 0 ? Number(((count / totalPredicted) * 100).toFixed(1)) : 0;

    res.status(200).json({
      total_students: totalStudents,
      total_predicted: totalPredicted,
      distribution: {
        HIGH: { count: highCount, percent: calcPct(highCount) },
        MEDIUM: { count: mediumCount, percent: calcPct(mediumCount) },
        LOW: { count: lowCount, percent: calcPct(lowCount) },
      },
      recent_predictions: recentPredictions.map((p) => ({
        id: p.id,
        user_email: p.user.email,
        risk_level: p.risk_level,
        model_version: p.model_version,
        created_at: p.created_at,
      })),
    });
  } catch (error) {
    console.error('Lỗi phân bố nguy cơ AI:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/ai-monitor/logs - Danh sách lịch sử gọi AI có phân trang & bộ lọc
export const getAILogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePaginationParams(req.query);
    const actionType = req.query.actionType as string;
    const status = req.query.status as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { function_type: searchFilter(search) },
        { error_message: searchFilter(search) },
      ];
    }
    if (actionType) where.function_type = actionType;
    if (status) where.status = status;

    const [totalRecords, logs] = await Promise.all([
      prisma.aILog.count({ where }),
      prisma.aILog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json(formatPaginatedResponse(logs, totalRecords, page, limit));
  } catch (error) {
    console.error('Lỗi lấy AI logs:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/ai-monitor/config - Cấu hình tham số AI
export const getAIConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.aIConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // Cung cấp các cấu hình mặc định nếu bảng đang rỗng
    if (configs.length === 0) {
      const defaultConfigs = [
        { key: 'RISK_THRESHOLD_HOURS', value: '5', description: 'Số giờ học tối thiểu mỗi tuần trước khi cảnh báo rủi ro' },
        { key: 'MAX_DAILY_REQUESTS', value: '100', description: 'Giới hạn số lượt gọi AI Chat Gia sư mỗi sinh viên / ngày' },
        { key: 'FALLBACK_RULE_ENABLED', value: 'true', description: 'Tự động kích hoạt cơ chế Rule-based fallback khi AI Service offline' },
        { key: 'MODEL_VERSION', value: 'v2.1-random-forest', description: 'Phiên bản mô hình Machine Learning đang phục vụ' },
      ];
      for (const item of defaultConfigs) {
        await prisma.aIConfig.upsert({
          where: { key: item.key },
          update: {},
          create: item,
        });
      }
      const seeded = await prisma.aIConfig.findMany({ orderBy: { key: 'asc' } });
      res.status(200).json(seeded);
      return;
    }

    res.status(200).json(configs);
  } catch (error) {
    console.error('Lỗi lấy cấu hình AI:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/ai-monitor/config/:key - Cập nhật cấu hình AI theo key
export const updateAIConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key);
    const { value, description } = req.body;

    if (value === undefined) {
      res.status(400).json({ message: 'Giá trị cấu hình (value) không được để trống' });
      return;
    }

    const config = await prisma.aIConfig.upsert({
      where: { key },
      update: {
        value: String(value),
        ...(description ? { description } : {}),
        updated_by: req.user?.email || 'admin',
      },
      create: {
        key,
        value: String(value),
        description: description || null,
        updated_by: req.user?.email || 'admin',
      },
    });

    await logAdminAction(
      req,
      'CONFIG_UPDATE',
      'AIConfig',
      config.id,
      `Thay đổi tham số cấu hình hệ thống: "${key}" = "${value}"`,
      { newData: config }
    );

    res.status(200).json(config);
  } catch (error) {
    console.error('Lỗi cập nhật cấu hình AI:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
