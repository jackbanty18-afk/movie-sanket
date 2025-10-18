import { NextRequest } from "next/server";
import { 
  listNotificationCampaigns,
  upsertNotificationCampaign,
  getUsersBySegment,
  sendNotificationToUsers,
  getNotificationTemplate,
  getRolesByEmail 
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check admin role
async function isAdmin(req: NextRequest): Promise<boolean> {
  const userEmail = req.headers.get('x-user-email');
  if (!userEmail) return false;
  const roles = getRolesByEmail(userEmail);
  return roles.includes('admin');
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const segment = searchParams.get("segment");
    
    // If segment is provided, return user count for that segment
    if (segment) {
      const users = getUsersBySegment(segment as any);
      return Response.json({ 
        segment,
        userCount: users.length,
        users: users.slice(0, 10) // Return first 10 users as preview
      });
    }

    // Otherwise return all campaigns
    const campaigns = listNotificationCampaigns();
    return Response.json({ campaigns });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return Response.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, templateId, userSegment, scheduledAt, variables, customUsers } = body;
    
    if (!name || !templateId || !userSegment) {
      return Response.json({ 
        error: "Name, template ID, and user segment are required" 
      }, { status: 400 });
    }

    // Validate template exists
    const template = getNotificationTemplate(templateId);
    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Get recipients based on segment or custom selection
    let recipients: { email: string; fullName: string; id: string }[] = [];
    
    if (userSegment === 'custom' && customUsers && Array.isArray(customUsers)) {
      // Use custom selected users
      recipients = customUsers.filter(user => user.email && user.fullName && user.id);
    } else {
      // Use predefined segment
      recipients = getUsersBySegment(userSegment);
    }
    
    if (recipients.length === 0) {
      return Response.json({ 
        error: userSegment === 'custom' 
          ? "No users selected for custom notification" 
          : "No recipients found for this segment" 
      }, { status: 400 });
    }

    const campaignId = 'campaign_' + Math.random().toString(36).substr(2, 9);
    const userEmail = req.headers.get('x-user-email');
    const now = new Date().toISOString();

    // Create campaign
    const campaign = {
      id: campaignId,
      name,
      templateId,
      userSegment,
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'scheduled' as const : 'sending' as const,
      recipientCount: recipients.length,
      sentCount: 0,
      createdBy: userEmail || undefined
    };

    upsertNotificationCampaign(campaign);

    // If not scheduled, send immediately
    if (!scheduledAt) {
      try {
        const sentCount = sendNotificationToUsers(templateId, recipients, variables);
        
        // Update campaign status
        upsertNotificationCampaign({
          ...campaign,
          status: 'sent',
          sentCount,
          sentAt: now
        });

        return Response.json({ 
          success: true, 
          campaignId,
          message: `Campaign sent successfully to ${sentCount} users`,
          sentCount
        });
      } catch (error) {
        // Update campaign as failed
        upsertNotificationCampaign({
          ...campaign,
          status: 'failed'
        });
        
        return Response.json({ 
          error: "Failed to send notifications" 
        }, { status: 500 });
      }
    } else {
      return Response.json({ 
        success: true, 
        campaignId,
        message: `Campaign scheduled for ${scheduledAt}`,
        recipientCount: recipients.length
      });
    }
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return Response.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

// Send a test notification
export async function PUT(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, templateId, variables } = body;
    
    if (action === 'test') {
      const userEmail = req.headers.get('x-user-email');
      if (!userEmail) {
        return Response.json({ error: "User email required for test" }, { status: 400 });
      }

      // Get current user info
      const testUsers = [{ 
        email: userEmail, 
        fullName: 'Test User', 
        id: 'test' 
      }];

      const sentCount = sendNotificationToUsers(templateId, testUsers, variables);
      
      return Response.json({ 
        success: true, 
        message: `Test notification sent to ${userEmail}`,
        sentCount
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return Response.json({ error: "Failed to send test notification" }, { status: 500 });
  }
}