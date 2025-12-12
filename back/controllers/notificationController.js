const Notification = require('../models/notificationModel');
const { createError } = require('../utils/error');

// Get notifications with filtering and pagination
exports.getNotifications = async (req, res) => {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
}

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return next(createError(404, 'Notification not found'));
        }

        if (notification.userId.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You can only mark your own notifications as read'));
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        next(error);
    }
};

//Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
    try {
        const notifications = await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        next(error);
    }
};

// Delete a notification
exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.notificationId);
        
        if (!notification) {
            return next(createError(404, 'Notification not found'));
        }

        if (notification.userId.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You can only delete your own notifications'));
        }

        await Notification.findByIdAndDelete(req.params.notificationId);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Delete all notifications
exports.deleteAllNotifications = async (req, res, next) => {
    try {
        const query = { 
            userId: req.user._id
        };
        
        await Notification.deleteMany(query);

        res.status(200).json({
            success: true,
            message: 'All notifications deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};