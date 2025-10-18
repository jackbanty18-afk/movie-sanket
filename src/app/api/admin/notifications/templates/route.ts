import { NextRequest } from "next/server";
import { 
  listNotificationTemplates, 
  getNotificationTemplate, 
  upsertNotificationTemplate, 
  deleteNotificationTemplate,
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
    const templateId = searchParams.get("id");
    
    if (templateId) {
      const template = getNotificationTemplate(templateId);
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }
      return Response.json({ template });
    } else {
      const templates = listNotificationTemplates();
      return Response.json({ templates });
    }
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return Response.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, subject, content, type, variables } = body;
    
    if (!name || !subject || !content) {
      return Response.json({ 
        error: "Name, subject, and content are required" 
      }, { status: 400 });
    }

    const templateId = 'template_' + Math.random().toString(36).substr(2, 9);
    const userEmail = req.headers.get('x-user-email');
    
    upsertNotificationTemplate({
      id: templateId,
      name,
      subject,
      content,
      type: type || 'general',
      variables: variables || [],
      isActive: true,
      createdBy: userEmail || undefined
    });

    return Response.json({ 
      success: true, 
      templateId,
      message: "Template created successfully" 
    });
  } catch (error) {
    console.error("Failed to create template:", error);
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, subject, content, type, variables, isActive } = body;
    
    if (!id || !name || !subject || !content) {
      return Response.json({ 
        error: "ID, name, subject, and content are required" 
      }, { status: 400 });
    }

    // Check if template exists
    const existing = getNotificationTemplate(id);
    if (!existing) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    
    upsertNotificationTemplate({
      id,
      name,
      subject,
      content,
      type: type || existing.type,
      variables: variables || existing.variables,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      createdBy: existing.createdBy
    });

    return Response.json({ 
      success: true, 
      message: "Template updated successfully" 
    });
  } catch (error) {
    console.error("Failed to update template:", error);
    return Response.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!await isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");
    
    if (!templateId) {
      return Response.json({ error: "Template ID is required" }, { status: 400 });
    }

    deleteNotificationTemplate(templateId);

    return Response.json({ 
      success: true, 
      message: "Template deleted successfully" 
    });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return Response.json({ error: "Failed to delete template" }, { status: 500 });
  }
}