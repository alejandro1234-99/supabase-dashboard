var WEBHOOK_URL = "https://hook.eu2.make.com/rx1tx6dxkfr0ldx2fmbgw9kx7e8d7zqw";

function onFormSubmit(e) {
  var values = e.values;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var respuestas = {};
  for (var i = 0; i < values.length; i++) {
    var key = sheetHeaders[i] ? String(sheetHeaders[i]) : "col_" + i;
    respuestas[key] = values[i];
  }

  var payload = {
    timestamp: values[0],
    respuestas: respuestas
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log(response.getResponseCode() + ": " + response.getContentText());
}

// Ejecuta esto para probar manualmente desde el editor
function testWebhook() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastRowValues = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  onFormSubmit({ values: lastRowValues.map(String) });
}
