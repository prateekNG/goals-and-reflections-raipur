// Original script written by Mahendra
/*
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sync')
    .addItem('Sync with Slack', 'sendGoalsReflectionToSlack')
    .addItem('Sync with Discord', 'sendGoalsReflectionToDiscord')
    .addToUi();
}

const slackToken = PropertiesService.getScriptProperties().getProperty('slackToken');
const spreadsheetId = PropertiesService.getScriptProperties().getProperty('sourceSheetID');

// Channel ID for sending messages
const targetChannelId = 'C05M9NNRWD6'; // raipur-campus
const managerSlackMemberID = PropertiesService.getScriptProperties().getProperty('managerSlackID');
console.log(managerSlackMemberID);
// Main function
function sendGoalsReflectionToSlack() {
  const sheetName = "CP Goals-Reflection";  // source sheet for goals and reflections
  const sheet = getSheetByName(spreadsheetId, sheetName);
  // const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);

  if (!sheet) {
    console.error(`Sheet ${ sheetName } not found.`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  const today = new Date();
  const formattedToday = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd MMM, yyyy');

  const emailToSlackID = getEmailToUserID();
  const messagesToUpdate = [];
  let hasTodayEntries = false;
  const messages = [];

  // Iterate through the data to collect messages and check for today's entries
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rawDate = row[0];
    const dateCell = new Date(rawDate);
    const formattedDate = Utilities.formatDate(dateCell, Session.getScriptTimeZone(), 'dd MMM, yyyy');
    if (formattedDate == formattedToday) {
      hasTodayEntries = true;
      const email = row[1];
      const goals = row[2] || "No goals mentioned.";
      const reflections = row[3] || "No reflections mentioned.";
      const messageSent = row[4]; // Column E for message sent status

      // Check if the message has not been sent
      if (messageSent !== true) {
        if (emailToSlackID.hasOwnProperty(email)) {
          const slackID = emailToSlackID[email];
          const message = formatMessage(slackID, goals, reflections);

          messages.push(message);

          // Add row index to the list to mark the message as sent
          messagesToUpdate.push(i + 1); // 1-based index for Google Sheets
        } else {
          console.log("Email not found in emailToSlackID:", email);
        }
      } else {
        console.log("Message already sent. Skipping row:", i);
      }
    }
  }

  // If there are no entries for the current date, log and exit
  if (!hasTodayEntries) {
    console.log(`No entries found for ${ formattedToday }.Exiting script.`);
    return;
  }

  // Send the thread message and individual messages if there are updates
  if (messages.length > 0) {
    const threadMessage = `${managerSlackMemberID ? `<@${managerSlackMemberID}>` : 'Hi Manager'} - Here is your team's update thread for today - \`${formattedToday}\``;

    // Checking if a thread ID for today's updates already exists
    const { storedThreadId, storedDate } = getStoredThreadData();
    let threadTs = storedThreadId;

    // If no thread ID is stored or the stored date is not today, create a new thread
    if (!threadTs || storedDate !== formattedToday) {
      threadTs = sendSlackMessage(targetChannelId, threadMessage);
      setStoredThreadData(threadTs, formattedToday); // Store the new thread timestamp with today's date
    }

    // Send individual messages in the thread
    messages.forEach(message => {
      sendSlackMessage(targetChannelId, message, threadTs);
    });

    // Batch update the sheet to mark messages as sent
    const rangeList = sheet.getRangeList(messagesToUpdate.map(row => E`${ row }`));
    rangeList.getRanges().forEach(range => range.setValue(true));
  }
}

// Function to format the message with goals and reflections as indented lists
function formatMessage(slackID, goals, reflections) {
  const goalsList = goals.split('\n').map(goal => `- ${ goal }`).join('\n'); // Create a bullet list for goals
  const reflectionsList = reflections.split('\n').map(reflection => `- ${ reflection }`).join('\n'); // Create a bullet list for reflections

  return `### Here are the goals for today from <@${slackID}>:\n\n` +
      `***Goals for today:***\n${ goalsList || "No goals mentioned."} \n\n` +
      `***Reflections of yesterday:***\n${ reflectionsList || "No reflections mentioned." }\n\n`;
}

function getEmailToUserID() {
  const sheetName = 'Members Master'; // source for all members ID
  const sheet = getSheetByName(spreadsheetId, sheetName);
  if (!sheet) {
    console.error(`Sheet ${ sheetName } not found.`);
    return {};
  }

  const data = sheet.getDataRange().getValues();
  const emailToSlackID = {};

  data.slice(1).forEach(row => {
    const email = row[1];
    const slackID = row[2];
    emailToSlackID[email] = slackID;
  });

  return emailToSlackID;
}

function getSheetByName(spreadsheetId, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    return spreadsheet.getSheetByName(sheetName);
  } catch (error) {
    console.error("Error accessing spreadsheet or sheet: ", error);
    return null;
  }
}

function sendSlackMessage(channel, messageText, threadTs = null) {
  const url = "https://slack.com/api/chat.postMessage";
  const payload = {
    channel: channel,
    text: messageText,
    thread_ts: threadTs, // thread timestamp for threading messages
    link_names: true // user tagging
  };

  const options = {
    method: "post",
    payload: JSON.stringify(payload),
    contentType: "application/json",
    headers: {
      "Authorization": Bearer ${ slackToken }
},
muteHttpExceptions: true
    };

try {
  const response = UrlFetchApp.fetch(url, options);
  const responseData = JSON.parse(response.getContentText());
  if (responseData.ok) {
    console.log("Message sent successfully!");
    return responseData.ts; // Return the timestamp for threading
  } else {
    console.error("Error sending message: " + responseData.error);
  }
} catch (e) {
  console.error("Error sending message: " + e);
}
  }

// Helper functions to get and set the thread ID and date in script properties
function getStoredThreadData() {
  const properties = PropertiesService.getScriptProperties();
  return {
    storedThreadId: properties.getProperty('threadTs'),
    storedDate: properties.getProperty('threadDate')
  };
}

function setStoredThreadData(threadTs, threadDate) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('threadTs', threadTs);
  properties.setProperty('threadDate', threadDate);
}
  */