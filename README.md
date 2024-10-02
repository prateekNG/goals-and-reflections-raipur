# Goals and Reflections Sync

This project is a Google Apps Script that fetches goals and reflections from a Google Spreadsheet to Discord and Slack.

## Project Structure

- `.clasp.json`: Configuration file for clasp, the Apps Script command line tool.
- `.claspignore`: Files to ignore when pushing to Apps Script.
- `.gitignore`: Files to ignore in git.
- `appsscript.json`: Configuration file for the Apps Script project.
- `Code.js`: Main script file.
- `UpdateDiscord.js`: Script to sync data with Discord.
- `UpdateSlack.js`: Script to sync data with Slack.
- `README.md`: This file.

## Functions

### `UpdateDiscord.js`

- `onOpen()`
    - Adds a custom menu to the Google Spreadsheet UI for syncing with Discord.

- `sendGoalsReflectionToDiscord()`
    - Main function to send goals and reflections to Discord.

- `formatMessage(userID, goals, reflections, formattedToday)`
    - Formats the message with goals and reflections as indented lists.

- `getEmailToUserID(spreadsheetId)`
    - Retrieves a mapping of email addresses to user IDs from the specified spreadsheet.

- `getSheetByName(spreadsheetId, sheetName)`
    - Retrieves a sheet by name from the specified spreadsheet.

- `sendDiscordMessageViaWebhook(webhookID, webhookToken, threadID, message)`
    - Sends a message to Discord via a webhook.

### `UpdateSlack.js`

- `setStoredThreadData(threadTs, threadDate)`
    - Stores thread data in script properties.

## Configuration

- Ensure that the `appsscript.json` file is configured with the correct time zone and runtime version.
- Update the `.clasp.json` file with your script ID and project ID.

## Usage

1. Open the Google Spreadsheet.
2. Click on the `Sync` menu and select `Sync with Discord` to send goals and reflections to Discord.

## License

This project is licensed under the MIT License.