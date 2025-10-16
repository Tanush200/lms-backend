const AcademicCalendar = require("../models/AcademicCalendar");

// Get all calendar events
const getCalendarEvents = async (req, res) => {
  try {
    const schoolId = req.user.school._id || req.user.school;
    const { startDate, endDate, eventType } = req.query;

    console.log("📅 Fetching calendar events for school:", schoolId);
    console.log("Query params:", { startDate, endDate, eventType });

    let query = { school: schoolId, isActive: true };

    // String comparison for date ranges (works with YYYY-MM-DD format)
    if (startDate && endDate) {
      query.startDate = { $lte: endDate };
      query.endDate = { $gte: startDate };
    }

    if (eventType) {
      query.eventType = eventType;
    }

    console.log("MongoDB query:", query);

    const events = await AcademicCalendar.find(query)
      .populate("createdBy", "name email")
      .sort({ startDate: 1 });

    console.log("✅ Found events:", events.length);

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("❌ Get calendar events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar events",
      error: error.message,
    });
  }
};

// Create new calendar event
const createCalendarEvent = async (req, res) => {
  try {
    console.log("📅 Creating calendar event...");
    console.log("User:", req.user._id, "Role:", req.user.role);
    console.log("School:", req.user.school);
    console.log("Request body:", req.body);

    // Validate required fields
    if (!req.body.title || !req.body.eventType || !req.body.startDate || !req.body.endDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, eventType, startDate, endDate",
      });
    }

    // Check if user has a school
    if (!req.user.school) {
      return res.status(400).json({
        success: false,
        message: "User must be associated with a school to create events",
      });
    }

    const schoolId = req.user.school._id || req.user.school;
    const eventData = {
      ...req.body,
      school: schoolId,
      createdBy: req.user._id,
      isActive: true,
    };

    console.log("Event data to create:", eventData);

    // String comparison for dates
    if (eventData.endDate < eventData.startDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be on or after start date",
      });
    }

    const event = await AcademicCalendar.create(eventData);
    console.log("✅ Event created:", event._id);

    const populatedEvent = await AcademicCalendar.findById(event._id).populate(
      "createdBy",
      "name email"
    );

    res.status(201).json({
      success: true,
      message: "Calendar event created successfully",
      data: populatedEvent,
    });
  } catch (error) {
    console.error("❌ Create calendar event error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create calendar event",
      error: error.message,
    });
  }
};

// Update calendar event
const updateCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school._id || req.user.school;

    console.log("📝 Updating calendar event:", id);
    console.log("User:", req.user._id, "Role:", req.user.role);

    const event = await AcademicCalendar.findOne({
      _id: id,
      school: schoolId,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    // Check permission - admin and principal can update any event
    if (
      req.user.role !== "admin" &&
      req.user.role !== "principal" &&
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this event",
      });
    }

    Object.assign(event, req.body);
    await event.save();

    const updatedEvent = await AcademicCalendar.findById(event._id).populate(
      "createdBy",
      "name email"
    );

    console.log("✅ Event updated successfully");

    res.json({
      success: true,
      message: "Calendar event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("❌ Update calendar event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update calendar event",
      error: error.message,
    });
  }
};

// Delete calendar event
const deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school._id || req.user.school;

    console.log("🗑️ Deleting calendar event:", id);

    const event = await AcademicCalendar.findOne({
      _id: id,
      school: schoolId,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    // Check permission - admin and principal can delete any event
    if (
      req.user.role !== "admin" &&
      req.user.role !== "principal" &&
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this event",
      });
    }

    await event.deleteOne();

    console.log("✅ Event deleted successfully");

    res.json({
      success: true,
      message: "Calendar event deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete calendar event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete calendar event",
      error: error.message,
    });
  }
};

// Get upcoming events
const getUpcomingEvents = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const limit = parseInt(req.query.limit) || 5;
    const today = new Date().toISOString().split("T")[0]; // Get today as YYYY-MM-DD string

    const events = await AcademicCalendar.find({
      school: schoolId,
      isActive: true,
      startDate: { $gte: today }, // String comparison works for YYYY-MM-DD
    })
      .populate("createdBy", "name")
      .sort({ startDate: 1 })
      .limit(limit);

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Get upcoming events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming events",
      error: error.message,
    });
  }
};

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getUpcomingEvents,
};
