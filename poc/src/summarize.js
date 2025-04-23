const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize OpenAI client with the same API key used for transcription
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a meeting summary from a transcription using OpenAI's GPT model
 * @param {string} transcription - The meeting transcription text
 * @returns {Promise<Object>} - Promise that resolves with the structured summary
 */
async function generateMeetingSummary(transcription) {
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
      summaryData = JSON.parse(summaryText);
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
 * Save meeting data including transcription and summary to a JSON file
 * @param {Object} meetingData - Meeting data to save
 * @param {string} meetingData.title - Meeting title
 * @param {string} meetingData.date - Meeting date
 * @param {string} meetingData.transcription - Full transcription
 * @param {Object} meetingData.summary - Structured summary object
 * @returns {Promise<string>} - Promise that resolves with the path to the saved file
 */
async function saveMeetingData(meetingData) {
  try {
    // Ensure required fields
    if (!meetingData.title || !meetingData.transcription || !meetingData.summary) {
      throw new Error('Missing required meeting data fields');
    }

    // Create meetings directory if it doesn't exist
    const meetingsDir = path.join(__dirname, '../meetings');
    if (!fs.existsSync(meetingsDir)) {
      fs.mkdirSync(meetingsDir, { recursive: true });
    }

    // Generate a filename based on date and title
    const date = meetingData.date || new Date().toISOString().split('T')[0];
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
 * Get list of saved meetings
 * @returns {Promise<Array>} - Promise that resolves with array of meeting metadata
 */
async function listSavedMeetings() {
  try {
    const meetingsDir = path.join(__dirname, '../meetings');
    if (!fs.existsSync(meetingsDir)) {
      return [];
    }

    // Get all JSON files in meetings directory
    const files = fs.readdirSync(meetingsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(meetingsDir, file);
        try {
          // Read just enough of each file to get metadata
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            id: file.replace('.json', ''),
            title: data.title || 'Untitled Meeting',
            date: data.date || 'Unknown Date',
            path: filePath
          };
        } catch (err) {
          console.error(`Error reading meeting file ${file}:`, err);
          return null;
        }
      })
      .filter(meeting => meeting !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

    return files;
  } catch (error) {
    console.error('Error listing meetings:', error);
    throw error;
  }
}

/**
 * Load a specific meeting by ID
 * @param {string} meetingId - ID of the meeting to load
 * @returns {Promise<Object>} - Promise that resolves with the meeting data
 */
async function loadMeeting(meetingId) {
  try {
    const meetingsDir = path.join(__dirname, '../meetings');
    const filePath = path.join(meetingsDir, `${meetingId}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error loading meeting:', error);
    throw error;
  }
}

// Export the functions
module.exports = {
  generateMeetingSummary,
  saveMeetingData,
  listSavedMeetings,
  loadMeeting
};
