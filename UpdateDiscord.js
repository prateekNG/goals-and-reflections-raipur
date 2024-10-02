function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sync')
    .addItem('Sync with Discord', 'sendGoalsReflectionToDiscord')
    .addToUi();
}

// Main function
function sendGoalsReflectionToDiscord() {
  const sheetName = "CP Goals-Reflection";  // source sheet for goals and reflections
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('sourceSheetID');
  const sheet = getSheetByName(spreadsheetId, sheetName);

  if (!sheet) {
    console.error(`Sheet ${sheetName} not found.`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  const today = new Date();
  const formattedToday = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd MMM, yyyy');

  const emailToUserID = getEmailToUserID(spreadsheetId);
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
      const messageSent = row[5]; // Column F for message sent status

      // Check if the message has not been sent
      if (messageSent !== true) {
        if (emailToUserID.has(email)) {
          const userID = emailToUserID.get(email);
          const message = formatMessage(userID, goals, reflections, formattedToday);

          messages.push(message);

          // Add row index to the list to mark the message as sent
          messagesToUpdate.push(i + 1); // 1-based index for Google Sheets
        } else {
          console.log("Email not found in emailToUserID:", email);
        }
      } else {
        console.log("Message already sent. Skipping row:", i);
      }
    }
  }

  // If there are no entries for the current date, log and exit
  if (!hasTodayEntries) {
    console.log(`No entries found for ${formattedToday}.Exiting script.`);
    return;
  }

  // Send the thread message and individual messages if there are updates
  if (messages.length > 0) {
    const managerUserID = PropertiesService.getScriptProperties().getProperty('managerUserID');
    const webhookID = PropertiesService.getScriptProperties().getProperty('webhookID');
    const webhookToken = PropertiesService.getScriptProperties().getProperty('webhookToken');
    const threadID = PropertiesService.getScriptProperties().getProperty('threadID');

    const threadMessage = `## ${managerUserID ? `<@${managerUserID}>` : 'Hi Manager'} - Here is your team's update thread for today - \`${formattedToday}\``;

    sendDiscordMessageViaWebhook(webhookID, webhookToken, threadID, threadMessage);

    messages.forEach(message => {
      sendDiscordMessageViaWebhook(webhookID, webhookToken, threadID, message);
    });

    // Batch update the sheet to mark messages as sent
    const rangeList = sheet.getRangeList(messagesToUpdate.map(row => `F${row}`));
    rangeList.getRanges().forEach(range => range.setValue(true));
  }
}

// Function to format the message with goals and reflections as indented lists
function formatMessage(userID, goals, reflections, formattedToday) {
  const goalsList = goals ? goals.split('\n').map(goal => goal.trim()).filter(goal => goal).map(goal => `- ${goal}`).join('\n') : undefined; // Create a bullet list for goals
  const reflectionsList = reflections ? reflections.split('\n').map(reflection => reflection.trim()).filter(reflection => reflection).map(reflection => `- ${reflection}`).join('\n') : undefined; // Create a bullet list for reflections

  return `### Here are the goals for today (${formattedToday}) from <@${userID}>:\n\n` +
    `***Goals for today:***\n${goalsList || "No goals mentioned."} \n\n` +
    `***Reflections of yesterday:***\n${reflectionsList || "No reflections mentioned."}\n\n`;
}

function getEmailToUserID(spreadsheetId) {
  const sheetName = 'Members Master'; // source for all members ID

  const sheet = getSheetByName(spreadsheetId, sheetName);
  if (!sheet) {
    console.error(`Sheet ${sheetName} not found.`);
    return {};
  }

  const data = sheet.getDataRange().getValues();
  const emailToUserID = new Map();

  data.slice(1).forEach(row => {
    const email = row[1];
    const userID = row[3];
    emailToUserID.set(email, userID);
  });

  return emailToUserID;
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

function sendDiscordMessageViaWebhook(webhookID, webhookToken, threadID, message) {
  const url = `https://discord.com/api/webhooks/${webhookID}/${webhookToken}?thread_id=${threadID}`;
  const payload = {
    content: message,
  };

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  if (responseCode !== 204) {
    Logger.log(`Error sending message to Discord. Response code: ${responseCode}`);
  } else {
    Logger.log("Message sent to Discord successfully.");
  }
}
