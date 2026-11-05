import { Response } from 'express';
import os from 'os';
import axios from 'axios';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAdminAction } from '../utils/activityLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /api/admin/system/health - Trạng thái hạ tầng 3 thành phần (Node.js, DB, AI Microservice)
export const getSystemHealth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Node.js Backend Stats
    const memUsage = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;

    const backendStats = {
      status: 'HEALTHY',
      uptime_seconds: uptimeSec,
      uptime_formatted: `${hours}h ${minutes}m ${seconds}s`,
      memory: {
        rss_mb: Number((memUsage.rss / 1024 / 1024).toFixed(1)),
        heap_used_mb: Number((memUsage.heapUsed / 1024 / 1024).toFixed(1)),
        heap_total_mb: Number((memUsage.heapTotal / 1024 / 1024).toFixed(1)),
      },
      cpu_cores: os.cpus().length,
      platform: `${os.platform()} (${os.arch()})`,
      node_version: process.version,
    };

    // 2. Database Connection Check
    const dbStart = Date.now();
    let dbStatus = 'CONNECTED';
    let dbLatency = 0;
    let counts = { users: 0, courses: 0, materials: 0, predictions: 0 };

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;

      const [usersCount, coursesCount, materialsCount, predictionsCount] = await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.material.count(),
        prisma.prediction.count(),
      ]);
      counts = {
        users: usersCount,
        courses: coursesCount,
        materials: materialsCount,
        predictions: predictionsCount,
      };
    } catch (dbErr: any) {
      dbStatus = 'DISCONNECTED';
      dbLatency = -1;
    }

    const databaseStats = {
      status: dbStatus,
      latency_ms: dbLatency,
      counts,
    };

    // 3. AI Service Health Check
    let aiStatus = 'OFFLINE';
    let aiLatency = -1;
    let aiDetails: any = null;

    try {
      const aiStart = Date.now();
      const aiRes = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
      aiLatency = Date.now() - aiStart;
      aiStatus = 'ONLINE';
      aiDetails = aiRes.data;
    } catch (aiErr: any) {
      aiStatus = 'OFFLINE';
    }

    const aiStats = {
      status: aiStatus,
      url: AI_SERVICE_URL,
      latency_ms: aiLatency >= 0 ? aiLatency : null,
      details: aiDetails,
    };

    res.status(200).json({
      timestamp: new Date().toISOString(),
      overall_status: dbStatus === 'CONNECTED' ? (aiStatus === 'ONLINE' ? 'OPTIMAL' : 'DEGRADED') : 'CRITICAL',
      backend: backendStats,
      database: databaseStats,
      ai_service: aiStats,
    });
  } catch (error) {
    console.error('Lỗi kiểm tra sức khỏe hệ thống:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/system/backup - Xuất bản sao lưu dữ liệu cấu hình & danh mục hệ thống
export const triggerBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [courses, topics, sections, configs, notifications] = await Promise.all([
      prisma.course.findMany({ select: { id: true, code: true, name: true, difficulty: true, credits: true } }),
      prisma.topic.findMany({ select: { id: true, course_id: true, title: true, order_index: true } }),
      prisma.topicSection.findMany({ select: { id: true, topic_id: true, title: true, order_index: true } }),
      prisma.aIConfig.findMany(),
      prisma.systemNotification.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user?.email || 'admin',
      summary: {
        total_courses: courses.length,
        total_topics: topics.length,
        total_sections: sections.length,
        total_configs: configs.length,
        total_notifications: notifications.length,
      },
      data: {
        courses,
        topics,
        sections,
        configs,
        notifications,
      },
    };

    await logAdminAction(
      req,
      'BACKUP',
      'System',
      null,
      `Sao lưu CSDL hệ thống: ${courses.length} môn học, ${topics.length} chủ đề, ${sections.length} phần học, ${configs.length} cấu hình`,
      { newData: backupData.summary }
    );

    res.status(200).json({
      message: 'Tạo bản sao lưu dữ liệu thành công',
      backup: backupData,
    });
  } catch (error) {
    console.error('Lỗi tạo sao lưu dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

