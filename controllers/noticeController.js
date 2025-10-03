// const Notice = require("../models/Notice");
// const Enrollment = require("../models/Enrollment");
// const Course = require("../models/Course");

// // Create a new notice
// const createNotice = async (req, res) => {
//   try {
//     const { title, body, audience = {}, isPinned = false, isActive = true, attachments = [], category = "Information", priority = "Low", expiresAt } = req.body;

//     if (!title || !body) {
//       return res.status(400).json({ success: false, message: "Title and body are required" });
//     }

//     const notice = await Notice.create({
//       title,
//       body,
//       attachments,
//       audience: {
//         roles: Array.isArray(audience.roles) ? audience.roles : undefined,
//         courseIds: Array.isArray(audience.courseIds) ? audience.courseIds : undefined,
//         classes: Array.isArray(audience.classes) ? audience.classes : undefined,
//         userIds: Array.isArray(audience.userIds) ? audience.userIds : undefined,
//       },
//       isPinned: !!isPinned,
//       isActive: !!isActive,
//       category,
//       priority,
//       createdBy: req.user?._id,
//       publishedAt: new Date(),
//       expiresAt: expiresAt ? new Date(expiresAt) : null,
//     });

//     res.status(201).json({ success: true, data: { notice } });
//   } catch (error) {
//     console.error("Create notice error:", error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map((e) => e.message);
//       return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
//     }
//     res.status(500).json({ success: false, message: "Could not create notice", error: error.message });
//   }
// };

// // List notices with filters
// // const listNotices = async (req, res) => {
// //   try {
// //     const { page = 1, limit = 20, role, active, pinned, search, category, priority } = req.query;
// //     const now = new Date();
// //     const query = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };

// //     if (active !== undefined) query.isActive = active === "true";
// //     if (pinned !== undefined) query.isPinned = pinned === "true";
// //     if (role) query["audience.roles"] = role;
// //     if (category) query.category = category;
// //     if (priority) query.priority = priority;
// //     if (search) query.$or = [
// //       { title: { $regex: search, $options: "i" } },
// //       { body: { $regex: search, $options: "i" } },
// //     ];

// //     const notices = await Notice.find(query)
// //       .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
// //       .skip((page - 1) * limit)
// //       .limit(Number(limit));

// //     const total = await Notice.countDocuments(query);

// //     res.json({
// //       success: true,
// //       data: { notices, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
// //     });
// //   } catch (error) {
// //     console.error("List notices error:", error);
// //     res.status(500).json({ success: false, message: "Could not fetch notices", error: error.message });
// //   }
// // };



// // const listMyNotices = async (req, res) => {
// //   try {
// //     const userId = req.user._id;
// //     const role = req.user.role;
// //     const { page = 1, limit = 20, search } = req.query;
// //     const now = new Date();

// //     // Base conditions for audience matching
// //     const baseOrConditions = [
// //       { "audience.roles": role },
// //       { "audience.userIds": userId },
// //     ];

// //     // Get courseIds depending on role
// //     let courseIds = [];
// //     if (role === "student") {
// //       const enrollments = await Enrollment.find({ student: userId }).select("course");
// //       courseIds = enrollments.map((e) => e.course);
// //     } else if (role === "teacher") {
// //       const courses = await Course.find({
// //         $or: [{ instructor: userId }, { assistantInstructors: userId }],
// //       }).select("_id");
// //       courseIds = courses.map((c) => c._id);
// //     } else if (role === "parent") {
// //       const parent = req.user;
// //       const childIds = (parent.parentOf || []).map((id) => id.toString());
// //       if (childIds.length > 0) {
// //         const enrollments = await Enrollment.find({ student: { $in: childIds } }).select("course");
// //         courseIds = enrollments.map((e) => e.course);
// //       }
// //     }

// //     if (courseIds.length > 0) {
// //       baseOrConditions.push({ "audience.courseIds": { $in: courseIds } });
// //     }

// //     // Expiry condition
// //     const expiryCondition = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };

// //     // Search condition (if any)
// //     const searchCondition = search
// //       ? { $or: [{ title: { $regex: search, $options: "i" } }, { body: { $regex: search, $options: "i" } }] }
// //       : null;

// //     // Build final query combining conditions
// //     let query = {
// //       isActive: true,
// //       $and: [expiryCondition, { $or: baseOrConditions }],
// //     };

// //     if (searchCondition) {
// //       query.$and.push(searchCondition);
// //     }

// //     // Query notices
// //     const notices = await Notice.find(query)
// //       .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
// //       .skip((page - 1) * limit)
// //       .limit(Number(limit));

// //     const total = await Notice.countDocuments(query);

// //     res.json({
// //       success: true,
// //       data: {
// //         notices,
// //         pagination: {
// //           page: Number(page),
// //           limit: Number(limit),
// //           total,
// //           pages: Math.ceil(total / limit),
// //         },
// //       },
// //     });
// //   } catch (error) {
// //     console.error("List my notices error:", error);
// //     res.status(500).json({
// //       success: false,
// //       message: "Could not fetch my notices",
// //       error: error.message,
// //     });
// //   }
// // };

// // Get single notice
// const getNotice = async (req, res) => {
//   try {
//     const notice = await Notice.findById(req.params.id);
//     if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });
//     res.json({ success: true, data: { notice } });
//   } catch (error) {
//     console.error("Get notice error:", error);
//     res.status(500).json({ success: false, message: "Could not fetch notice", error: error.message });
//   }
// };

// // Update notice
// const updateNotice = async (req, res) => {
//   try {
//     const { title, body, audience, isPinned, isActive, attachments } = req.body;
//     const updates = {};
//     if (title !== undefined) updates.title = title;
//     if (body !== undefined) updates.body = body;
//     if (Array.isArray(attachments)) updates.attachments = attachments;
//     if (audience) {
//       updates.audience = {};
//       if (Array.isArray(audience.roles)) updates.audience.roles = audience.roles;
//       if (Array.isArray(audience.courseIds)) updates.audience.courseIds = audience.courseIds;
//       if (Array.isArray(audience.userIds)) updates.audience.userIds = audience.userIds;
//     }
//     if (isPinned !== undefined) updates.isPinned = !!isPinned;
//     if (isActive !== undefined) updates.isActive = !!isActive;

//     const notice = await Notice.findByIdAndUpdate(req.params.id, updates, { new: true });
//     if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });
//     res.json({ success: true, data: { notice } });
//   } catch (error) {
//     console.error("Update notice error:", error);
//     res.status(500).json({ success: false, message: "Could not update notice", error: error.message });
//   }
// };

// // Delete notice
// const deleteNotice = async (req, res) => {
//   try {
//     const notice = await Notice.findByIdAndDelete(req.params.id);
//     if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });
//     res.json({ success: true, message: "Notice deleted" });
//   } catch (error) {
//     console.error("Delete notice error:", error);
//     res.status(500).json({ success: false, message: "Could not delete notice", error: error.message });
//   }
// };

// module.exports = { createNotice, listNotices, getNotice, updateNotice, deleteNotice };
 
// // List notices for current user (teacher/parent/student/admin)
// const listMyNotices = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const role = req.user.role;
//     const { page = 1, limit = 20, search } = req.query;
//     const now = new Date();

//     const orConditions = [
//       { "audience.roles": role },
//       { "audience.userIds": userId },
//     ];

//     let courseIds = [];
//     if (role === "student") {
//       const enrollments = await Enrollment.find({ student: userId }).select("course");
//       courseIds = enrollments.map((e) => e.course);
//     } else if (role === "teacher") {
//       const courses = await Course.find({
//         $or: [{ instructor: userId }, { assistantInstructors: userId }],
//       }).select("_id");
//       courseIds = courses.map((c) => c._id);
//     } else if (role === "parent") {
//       const parent = req.user;
//       const childIds = (parent.parentOf || []).map((id) => id.toString());
//       if (childIds.length > 0) {
//         const enrollments = await Enrollment.find({ student: { $in: childIds } }).select("course");
//         courseIds = enrollments.map((e) => e.course);
//       }
//     }

//     if (courseIds.length > 0) {
//       orConditions.push({ "audience.courseIds": { $in: courseIds } });
//     }

//     const query = { isActive: true, $or: orConditions, $orExtra: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
//     // Merge expiry condition into main query
//     query.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }];
//     if (search) {
//       query.$and = [{ $or: [{ title: { $regex: search, $options: "i" } }, { body: { $regex: search, $options: "i" } }] }];
//     }

//     const notices = await Notice.find(query)
//       .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit));

//     const total = await Notice.countDocuments(query);

//     res.json({
//       success: true,
//       data: { notices, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
//     });
//   } catch (error) {
//     console.error("List my notices error:", error);
//     res.status(500).json({ success: false, message: "Could not fetch my notices", error: error.message });
//   }
// };

// module.exports.listMyNotices = listMyNotices;


const Notice = require("../models/Notice");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// Create a new notice
const createNotice = async (req, res) => {
  try {
    const {
      title,
      body,
      audience = {},
      isPinned = false,
      isActive = true,
      attachments = [],
      category = "Information",
      priority = "Low",
      expiresAt,
    } = req.body;

    if (!title || !body) {
      return res
        .status(400)
        .json({ success: false, message: "Title and body are required" });
    }

    const notice = await Notice.create({
      title,
      body,
      attachments,
      audience: {
        roles: Array.isArray(audience.roles) ? audience.roles : undefined,
        courseIds: Array.isArray(audience.courseIds)
          ? audience.courseIds
          : undefined,
        classes: Array.isArray(audience.classes) ? audience.classes : undefined,
        userIds: Array.isArray(audience.userIds) ? audience.userIds : undefined,
      },
      isPinned: !!isPinned,
      isActive: !!isActive,
      category,
      priority,
      createdBy: req.user?._id,
      publishedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({ success: true, data: { notice } });
  } catch (error) {
    console.error("Create notice error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: messages,
        });
    }
    res
      .status(500)
      .json({
        success: false,
        message: "Could not create notice",
        error: error.message,
      });
  }
};

// List notices with filters
const listNotices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      active,
      pinned,
      search,
      category,
      priority,
    } = req.query;
    const now = new Date();

    const query = {
      isActive: active === undefined ? true : active === "true",
      $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }],
    };

    if (role) query["audience.roles"] = role;
    if (pinned !== undefined) query["isPinned"] = pinned === "true";
    if (category) query["category"] = category;
    if (priority) query["priority"] = priority;
    if (search) {
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
        ],
      });
    }

    const notices = await Notice.find(query)
      .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notice.countDocuments(query);

    res.json({
      success: true,
      data: {
        notices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("List notices error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not fetch notices",
        error: error.message,
      });
  }
};

// List notices for current user (my notices)
const listMyNotices = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const { page = 1, limit = 20, search } = req.query;
    const now = new Date();

    const orConditions = [
      { "audience.roles": role },
      { "audience.userIds": userId },
    ];

    let courseIds = [];
    if (role === "student") {
      const enrollments = await Enrollment.find({ student: userId }).select(
        "course"
      );
      courseIds = enrollments.map((e) => e.course);
    } else if (role === "teacher") {
      const courses = await Course.find({
        $or: [{ instructor: userId }, { assistantInstructors: userId }],
      }).select("_id");
      courseIds = courses.map((c) => c._id);
    } else if (role === "parent") {
      const parent = req.user;
      const childIds = (parent.parentOf || []).map((id) => id.toString());
      if (childIds.length > 0) {
        const enrollments = await Enrollment.find({
          student: { $in: childIds },
        }).select("course");
        courseIds = enrollments.map((e) => e.course);
      }
    }

    if (courseIds.length > 0) {
      orConditions.push({ "audience.courseIds": { $in: courseIds } });
    }

    const expiryCondition = {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    const searchCondition = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { body: { $regex: search, $options: "i" } },
          ],
        }
      : null;

    const query = {
      isActive: true,
      $and: [expiryCondition, { $or: orConditions }],
    };

    if (searchCondition) {
      query.$and.push(searchCondition);
    }

    const notices = await Notice.find(query)
      .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notice.countDocuments(query);

    res.json({
      success: true,
      data: {
        notices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("List my notices error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not fetch my notices",
        error: error.message,
      });
  }
};

// Get single notice
const getNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    res.json({ success: true, data: { notice } });
  } catch (error) {
    console.error("Get notice error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not fetch notice",
        error: error.message,
      });
  }
};

// Update notice
const updateNotice = async (req, res) => {
  try {
    const { title, body, audience, isPinned, isActive, attachments } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (Array.isArray(attachments)) updates.attachments = attachments;
    if (audience) {
      updates.audience = {};
      if (Array.isArray(audience.roles))
        updates.audience.roles = audience.roles;
      if (Array.isArray(audience.courseIds))
        updates.audience.courseIds = audience.courseIds;
      if (Array.isArray(audience.userIds))
        updates.audience.userIds = audience.userIds;
    }
    if (isPinned !== undefined) updates.isPinned = !!isPinned;
    if (isActive !== undefined) updates.isActive = !!isActive;

    const notice = await Notice.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    res.json({ success: true, data: { notice } });
  } catch (error) {
    console.error("Update notice error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not update notice",
        error: error.message,
      });
  }
};

// Delete notice
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    res.json({ success: true, message: "Notice deleted" });
  } catch (error) {
    console.error("Delete notice error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not delete notice",
        error: error.message,
      });
  }
};

module.exports = {
  createNotice,
  listNotices,
  getNotice,
  updateNotice,
  deleteNotice,
  listMyNotices,
};