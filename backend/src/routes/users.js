const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const Document = require('../models/Document');

// @GET /api/users (admin only)
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await User.countDocuments();
  res.json({ success: true, users, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
}));

// @GET /api/users/dashboard
router.get('/dashboard', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const mongoose = require('mongoose');
  const oid = mongoose.Types.ObjectId.createFromHexString(userId);

  const [docStats, recentDocs, categoryBreakdown, activityData] = await Promise.all([
    Document.aggregate([
      { $match: { user: oid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalWords: { $sum: '$wordCount' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]),
    Document.find({ user: userId }).sort({ createdAt: -1 }).limit(5)
      .select('title fileType status classification.category createdAt'),
    Document.aggregate([
      { $match: { user: oid, 'classification.category': { $ne: '' } } },
      { $group: { _id: '$classification.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Document.aggregate([
      { $match: { user: oid } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ])
  ]);

  res.json({
    success: true,
    dashboard: {
      stats: docStats[0] || { total: 0, completed: 0, totalWords: 0, totalSize: 0 },
      recentDocuments: recentDocs,
      categoryBreakdown,
      activityData: activityData.reverse()
    }
  });
}));

// @PUT /api/users/:id/role (admin only)
router.put('/:id/role', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
}));

// @DELETE /api/users/:id (admin only)
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await Document.deleteMany({ user: req.params.id });
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
}));

module.exports = router;
