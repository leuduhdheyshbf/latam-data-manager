function doPost(e) {
  try {
    var input = JSON.parse(e.postData.contents || "{}");
    var action = input.action || "test";
    var ss = SpreadsheetApp.openById(extractId(input.url || input.spreadsheetId || ""));
    var sheet = input.sheet ? ss.getSheetByName(input.sheet) : ss.getSheets()[0];
    if (!sheet) return out({ ok:false, error:"A aba não foi encontrada." });

    if (action === "test") return out({ ok:true, spreadsheetId:ss.getId(), spreadsheetName:ss.getName(), sheet:sheet.getName() });
    if (action === "read") {
      var values = sheet.getDataRange().getDisplayValues();
      if (!values.length) return out({ ok:true, columns:[], rows:[], sheet:sheet.getName() });
      var columns = values[0].map(function(x,i){ return String(x || ("Coluna "+(i+1))); });
      var rows = values.slice(1).map(function(row, ri) {
        var obj = { __row: ri + 2 };
        columns.forEach(function(col,i){ obj[col] = row[i] == null ? "" : String(row[i]); });
        return obj;
      });
      return out({ ok:true, spreadsheetId:ss.getId(), spreadsheetName:ss.getName(), sheet:sheet.getName(), columns:columns, rows:rows });
    }
    if (action === "append") {
      var row = input.row || {};
      var headers = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getDisplayValues()[0];
      if (!headers.some(String)) return out({ ok:false, error:"A primeira linha precisa conter os nomes das colunas." });
      sheet.appendRow(headers.map(function(h){ return row[h] == null ? "" : row[h]; }));
      SpreadsheetApp.flush();
      return out({ ok:true });
    }
    if (action === "update") {
      var rowNumber = Number(input.rowNumber);
      if (!rowNumber || rowNumber < 2) return out({ ok:false, error:"Linha inválida." });
      var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      var row = input.row || {};
      sheet.getRange(rowNumber,1,1,headers.length).setValues([headers.map(function(h){ return row[h] == null ? "" : row[h]; })]);
      SpreadsheetApp.flush();
      return out({ ok:true });
    }
    if (action === "delete") {
      var rowNumber = Number(input.rowNumber);
      if (!rowNumber || rowNumber < 2) return out({ ok:false, error:"Linha inválida." });
      sheet.deleteRow(rowNumber);
      SpreadsheetApp.flush();
      return out({ ok:true });
    }
    return out({ ok:false, error:"Ação desconhecida." });
  } catch (err) {
    return out({ ok:false, error:String(err && err.message ? err.message : err) });
  }
}
function extractId(value) {
  var m = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]+$/.test(String(value))) return String(value);
  throw new Error("URL/ID de Google Sheets inválido.");
}
function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
