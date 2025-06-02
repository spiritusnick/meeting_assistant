import { OpenAI } from 'openai';
import { saveMeeting, listMeetings, loadMeeting } from './db.js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI client with the same API key used for transcription
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a meeting summary from a transcription using OpenAI's GPT model
 * @param transcription - The meeting transcription text
 * @returns Promise that resolves with the structured summary
 */
export async function generateMeetingSummary(transcription: string): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not set. Please set OPENAI_API_KEY in your .env file.');
    }

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('No transcription provided for summarization');
    }

    console.log(`Generating summary for transcription (${transcription.length} characters)`);

    // System prompt instructing the model how to format the summary
    const systemPrompt = `
      You are a meeting assistant that summarizes meetings.
      Based on the meeting transcript, create a concise, professional summary structured as follows:

      1. Overall Summary: 2-3 sentences that capture the main purpose and outcome of the meeting
      2. Key Points: 3-5 bullet points of the most important information discussed
      3. Action Items: Specific tasks that were assigned, including who is responsible (if mentioned)
      4. Decisions Made: Clear decisions that were finalized during the meeting

      Format your response as a structured JSON object with these sections as keys.
      If a section has no relevant content, include it with an empty array or appropriate default value.
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Using a capable model for summarization
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please summarize this meeting transcript: ${transcription}` }
      ],
      temperature: 0.3, // Lower temperature for more focused, deterministic outputs
      response_format: { type: "json_object" }
    });

    // Extract and parse the JSON response
    const summaryText = response.choices[0].message.content;
    let summaryData;
    
    try {
      summaryData = JSON.parse(summaryText || '{}');
      console.log("Successfully generated and parsed meeting summary");
    } catch (parseError) {
      console.error("Error parsing summary JSON:", parseError);
      throw new Error("Failed to parse summary response as JSON");
    }

    // Ensure all expected fields exist
    const defaultSummary = {
      "Overall Summary": "",
      "Key Points": [],
      "Action Items": [],
      "Decisions Made": []
    };

    return { ...defaultSummary, ...summaryData };
  } catch (error) {
    console.error('Summarization error:', error);
    throw error;
  }
}

/**
 * Save meeting data including transcription and summary to the database
 * @param meetingData - Meeting data to save
 * @returns Promise that resolves with the path to the saved file
 */
export async function saveMeetingData(meetingData: {
  title: string;
  date: string;
  transcription: string;
  summary: any;
}): Promise<string> {
  try {
    // Ensure required fields
    if (!meetingData.title || !meetingData.transcription || !meetingData.summary) {
      throw new Error('Missing required meeting data fields');
    }

    // Save to database using the db utility
    const meeting = await saveMeeting({
      title: meetingData.title,
      transcription: meetingData.transcription,
      summary: meetingData.summary
    });

    // For backwards compatibility, also save to a file
    // Create meetings directory if it doesn't exist
    const meetingsDir = path.join(__dirname, '../meetings');
    if (!fs.existsSync(meetingsDir)) {
      fs.mkdirSync(meetingsDir, { recursive: true });
    }

    // Generate a filename based on date and title
    const date = meetingData.date.split('T')[0];
    const safeTitle = meetingData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${date}-${safeTitle}.json`;
    const filePath = path.join(meetingsDir, filename);

    // Save the meeting data to JSON file
    fs.writeFileSync(filePath, JSON.stringify(meetingData, null, 2));
    console.log(`Meeting data saved to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error('Error saving meeting data:', error);
    throw error;
  }
}

/**
 * Get list of saved meetings from the database
 * @returns Promise that resolves with array of meeting metadata
 */
export async function listSavedMeetings(): Promise<any[]> {
  try {
    // Use the database utility to list meetings
    return await listMeetings();
  } catch (error) {
    console.error('Error listing meetings:', error);
    throw error;
  }
}

/**
 * Load a specific meeting by ID from the database
 * @param meetingId - ID of the meeting to load
 * @returns Promise that resolves with the meeting data
 */
export async function loadMeetingById(meetingId: string): Promise<any> {
  try {
    // Use the database utility to load a meeting
    return await loadMeeting(meetingId);
  } catch (error) {
    console.error('Error loading meeting:', error);
    throw error;
  }
}

// For backward compatibility
export { loadMeetingById as loadMeeting };
