import { PrismaClient as PClient } from '@prisma/client';

const PrismaClient = PClient;
import * as path from 'path';
import * as fs from 'fs';

// Initialize the Prisma client
const prisma = new PrismaClient();

/**
 * Initialize the database and make sure it's ready to use
 */
export async function initDatabase(): Promise<void> {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('Database connection established successfully.');
    
    // Create necessary directories if they don't exist
    const recordingsDir = path.join(__dirname, '../recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return Promise.reject(error);
  }
}

/**
 * Save a meeting with its transcription and summary
 */
export async function saveMeeting(data: {
  title: string;
  transcription: string;
  summary: any;
  fileUrl?: string;
}) {
  try {
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        fileUrl: data.fileUrl,
        summary: {
          create: {
            text: JSON.stringify(data.summary),
            keyPoints: data.summary['Key Points']?.join('\n') || null,
            actionItems: data.summary['Action Items']?.join('\n') || null,
            decisions: data.summary['Decisions Made']?.join('\n') || null
          }
        }
      },
      include: {
        summary: true
      }
    });
    
    // Create segments from transcription (would be done in a real implementation)
    // This is just a placeholder for now
    if (data.transcription) {
      await prisma.segment.create({
        data: {
          meetingId: meeting.id,
          text: data.transcription,
          startTime: 0,
          endTime: 0
        }
      });
    }
    
    return meeting;
  } catch (error) {
    console.error('Error saving meeting:', error);
    throw error;
  }
}

/**
 * List all saved meetings
 */
export async function listMeetings() {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        summary: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date.toISOString(),
      summary: meeting.summary ? JSON.parse(meeting.summary.text) : null
    }));
  } catch (error) {
    console.error('Error listing meetings:', error);
    throw error;
  }
}

/**
 * Load a specific meeting by ID
 */
export async function loadMeeting(id: string) {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        summary: true,
        segments: true
      }
    });
    
    if (!meeting) {
      throw new Error(`Meeting with ID ${id} not found`);
    }
    
    // Reconstruct the transcription from segments
    const transcription = meeting.segments.map(segment => segment.text).join(' ');
    
    return {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date.toISOString(),
      transcription,
      summary: meeting.summary ? JSON.parse(meeting.summary.text) : null
    };
  } catch (error) {
    console.error('Error loading meeting:', error);
    throw error;
  }
}

/**
 * Delete a meeting by ID
 */
export async function deleteMeeting(id: string) {
  try {
    await prisma.meeting.delete({
      where: { id }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
}

// Export the Prisma client for use in other modules
export { prisma };
