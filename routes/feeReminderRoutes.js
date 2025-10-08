const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const feeReminderController = require("../controllers/feeReminderController");

router.use(protect);
router.use(authorize("admin", "principal", "accountant","student"));

router.post("/create-or-update", feeReminderController.createOrUpdateReminder);
router.get("/list", feeReminderController.listReminders);
router.put("/mark-paid/:reminderId", feeReminderController.markAsPaid);
router.post("/send-due-reminders", feeReminderController.sendDueReminders);

module.exports = router;
