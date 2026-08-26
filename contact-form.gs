/**
 * Contact form → Google Sheet (opens in Excel, or export as .xlsx).
 *
 * Every message from saketabdeo.github.io lands as a row in this sheet, and
 * a copy is emailed to you so you don't have to remember to look.
 *
 * ── Setup, once ────────────────────────────────────────────────────────────
 *  1. sheets.new — name it "Website messages".
 *  2. Extensions → Apps Script. Delete whatever is there, paste this file.
 *  3. Set NOTIFY below to the address you want the alerts at.
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as ............ Me
 *       Who has access ........ Anyone            ← must be "Anyone"
 *  5. Authorise when it asks (it's your own script; the "unverified app"
 *     warning is expected — Advanced → Go to project).
 *  6. Copy the Web app URL. It ends in /exec. Send it to me and I'll wire
 *     the form to it.
 *
 * Changing the code later needs Deploy → Manage deployments → edit → new
 * version, or the live URL keeps running the old copy.
 */

var NOTIFY = 'abdeosaket23@gmail.com';   // EDIT: where the alert goes
var SHEET  = 'Messages';                 // tab name; created if missing

function doPost(e) {
  var lock = LockService.getScriptLock();       // two submissions at once
  lock.waitLock(20000);                         // must not share a row

  try {
    var book  = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = book.getSheetByName(SHEET);

    if (!sheet) {
      sheet = book.insertSheet(SHEET);
      sheet.appendRow(['Received', 'Name', 'Email', 'Message']);
      sheet.getRange('A1:D1').setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 170);
      sheet.setColumnWidth(2, 160);
      sheet.setColumnWidth(3, 220);
      sheet.setColumnWidth(4, 520);
    }

    var f       = (e && e.parameter) || {};
    var name    = String(f.fullname || '').slice(0, 200);
    var email   = String(f.email    || '').slice(0, 200);
    var message = String(f.message  || '').slice(0, 5000);

    /* Anything without all three is a bot hitting the endpoint directly. */
    if (!name || !email || !message) return reply({ ok: false, error: 'incomplete' });

    sheet.appendRow([new Date(), name, email, message]);

    try {
      MailApp.sendEmail({
        to: NOTIFY,
        subject: 'Website message from ' + name,
        replyTo: email,                          // hit reply and it goes to them
        body: message + '\n\n— ' + name + ' <' + email + '>\n' +
              'Logged in: ' + book.getUrl()
      });
    } catch (err) {
      /* Out of daily mail quota, say. The row is already saved, which is
         the part that matters, so don't fail the request over it. */
    }

    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* A GET in a browser should say something useful rather than error. */
function doGet() {
  return reply({ ok: true, note: 'Contact endpoint is live. POST to it.' });
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
