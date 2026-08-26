/**
 * Contact form → Google Sheet (opens in Excel, or export as .xlsx).
 *
 * Every message from saketabdeo.github.io lands as a row, and a copy is
 * emailed to you so you don't have to remember to look. The email now says
 * where the row went, so a message that arrives but doesn't save tells you
 * why in the same breath.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 *  1. Open the Sheet you want the rows in. Copy its ID from the address bar:
 *       docs.google.com/spreadsheets/d/ THIS-PART /edit
 *     and paste it into SHEET_ID below. Leave it '' to use whichever sheet
 *     this script is attached to — fine if you created the script from
 *     inside a Sheet via Extensions → Apps Script, and the cause of a
 *     silent no-op if you didn't.
 *  2. Set NOTIFY to the address you want the alerts at.
 *  3. Run whereAmIWriting() once from the editor (dropdown → Run). It prints
 *     the spreadsheet it will write to and creates the tab if missing, so
 *     you can see it working before a real message arrives.
 *  4. Deploy → New deployment → Web app.
 *       Execute as ............ Me
 *       Who has access ........ Anyone            ← must be "Anyone"
 *
 * Editing this file later does nothing to the live form until you do
 * Deploy → Manage deployments → pencil → Version: New version → Deploy.
 * The old code keeps running otherwise, which is the usual reason a fix
 * "doesn't work".
 */

var SHEET_ID = '1SOQZ_Mqg-eRvXg9_aa-HeNSljhzxjwHzEk_GeaLwwdE';   // the sheet rows go to
var NOTIFY   = 'abdeosaket23@gmail.com'; // EDIT: where the alert goes
var SHEET    = 'Messages';               // tab name; created if missing

/** Run this from the editor to see where rows will land. */
function whereAmIWriting() {
  var book = openBook();
  if (!book) {
    Logger.log('No spreadsheet. Paste an ID into SHEET_ID at the top of this file.');
    return;
  }
  tabFor(book);
  Logger.log('Writing to: ' + book.getUrl());
  Logger.log('Tab: ' + SHEET + '   (look along the bottom of the spreadsheet)');
}

function openBook() {
  if (SHEET_ID) {
    try { return SpreadsheetApp.openById(SHEET_ID); } catch (err) { return null; }
  }
  /* Null whenever the script isn't bound to a sheet — a standalone project,
     for one. Nothing to write to, and no error a visitor would ever see. */
  return SpreadsheetApp.getActiveSpreadsheet();
}

function tabFor(book) {
  var sheet = book.getSheetByName(SHEET);
  if (sheet) return sheet;

  sheet = book.insertSheet(SHEET);
  sheet.appendRow(['Received', 'Name', 'Email', 'Message']);
  sheet.getRange('A1:D1').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 520);
  return sheet;
}

function doPost(e) {
  var f       = (e && e.parameter) || {};
  var name    = String(f.fullname || '').slice(0, 200);
  var email   = String(f.email    || '').slice(0, 200);
  var message = String(f.message  || '').slice(0, 5000);

  /* Anything without all three is a bot hitting the endpoint directly. */
  if (!name || !email || !message) return reply({ ok: false, error: 'incomplete' });

  var where = '';
  var saved = false;

  var lock = LockService.getScriptLock();   // two submissions landing together
  lock.waitLock(20000);                     // must not share a row
  try {
    var book = openBook();
    if (book) {
      tabFor(book).appendRow([new Date(), name, email, message]);
      saved = true;
      where = 'Saved to the "' + SHEET + '" tab of ' + book.getUrl();
    } else {
      where = 'NOT SAVED — this script has no spreadsheet. Set SHEET_ID at the ' +
              'top of contact-form.gs, then Deploy → Manage deployments → New version.';
    }
  } catch (err) {
    where = 'NOT SAVED — ' + err;
  } finally {
    lock.releaseLock();
  }

  /* The message reaches you either way; the footer says whether it was also
     written down, so a broken sheet can't fail quietly. */
  try {
    MailApp.sendEmail({
      to: NOTIFY,
      subject: 'Website message from ' + name,
      replyTo: email,                       // hit reply and it goes to them
      body: message + '\n\n— ' + name + ' <' + email + '>\n\n' + where
    });
  } catch (err) { /* out of daily mail quota; the row is what matters */ }

  return reply({ ok: true, saved: saved });
}

/* A GET in a browser should say something useful rather than error. */
function doGet() {
  var book = openBook();
  return reply({
    ok: true,
    note: 'Contact endpoint is live. POST to it.',
    sheet: book ? book.getUrl() : 'none — set SHEET_ID'
  });
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
