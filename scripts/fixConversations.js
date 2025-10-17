/**
 * Script to fix conversations with null student or course
 * Run this once to clean up invalid conversations
 * 
 * Usage: node scripts/fixConversations.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const fixConversations = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    // Find conversations with null student or course
    const invalidConversations = await Conversation.find({
      $or: [{ student: null }, { course: null }],
    });

    console.log(`\n📊 Found ${invalidConversations.length} invalid conversations`);

    if (invalidConversations.length === 0) {
      console.log("✅ No invalid conversations found!");
      process.exit(0);
    }

    let fixed = 0;
    let deleted = 0;

    for (const conv of invalidConversations) {
      console.log(`\n🔍 Checking conversation ${conv._id}...`);

      // Try to find a message in this conversation to get student/course
      const message = await Message.findOne({
        $or: [
          { sender: { $in: conv.participants } },
          { receiver: { $in: conv.participants } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      if (message && message.student && message.course) {
        // Fix the conversation with data from message
        conv.student = message.student;
        conv.course = message.course;
        await conv.save();
        console.log(`✅ Fixed conversation ${conv._id}`);
        fixed++;
      } else {
        // No messages found or messages also missing data - delete conversation
        await Conversation.findByIdAndDelete(conv._id);
        console.log(`🗑️ Deleted conversation ${conv._id} (no valid messages)`);
        deleted++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   🗑️ Deleted: ${deleted}`);
    console.log(`   📝 Total processed: ${invalidConversations.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixConversations();
