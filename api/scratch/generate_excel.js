import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Thesis POS Management System";
  workbook.lastModifiedBy = "Antigravity AI";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper styles
  const headerStyle = {
    font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E78" } }, // Dark Navy Blue
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { argb: "808080" } },
      left: { style: "thin", color: { argb: "808080" } },
      bottom: { style: "medium", color: { argb: "1F4E78" } },
      right: { style: "thin", color: { argb: "808080" } },
    },
  };

  const titleStyle = {
    font: { name: "Calibri", size: 16, bold: true, color: { argb: "1F4E78" } },
    alignment: { vertical: "middle", horizontal: "left" },
  };

  const subtitleStyle = {
    font: { name: "Calibri", size: 12, italic: true, color: { argb: "595959" } },
  };

  const sectionHeaderStyle = {
    font: { name: "Calibri", size: 12, bold: true, color: { argb: "1F4E78" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } },
    alignment: { vertical: "middle", horizontal: "left" },
  };

  const cellBorder = {
    top: { style: "thin", color: { argb: "D9D9D9" } },
    left: { style: "thin", color: { argb: "D9D9D9" } },
    bottom: { style: "thin", color: { argb: "D9D9D9" } },
    right: { style: "thin", color: { argb: "D9D9D9" } },
  };

  const zebraFill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };

  function autoFitColumns(worksheet) {
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const str = cell.value ? cell.value.toString() : "";
        if (str.length > maxLength && !str.includes("\n") && cell.row > 4) {
          maxLength = Math.min(str.length, 40);
        }
      });
      column.width = maxLength + 4;
    });
  }

  // ==========================================
  // SHEET 1: Overview & Summary
  // ==========================================
  const sheetOverview = workbook.addWorksheet("Overview & Summary");
  sheetOverview.views = [{ showGridLines: true }];

  sheetOverview.mergeCells("A1:G1");
  const titleCell = sheetOverview.getCell("A1");
  titleCell.value = "📘 Database Normalization Report (UNF ➔ 1NF ➔ 2NF ➔ 3NF)";
  titleCell.font = titleStyle.font;

  sheetOverview.mergeCells("A2:G2");
  const subTitleCell = sheetOverview.getCell("A2");
  subTitleCell.value = "Restaurant POS & Inventory Management System ( Thesis Project Presentation )";
  subTitleCell.font = subtitleStyle.font;

  sheetOverview.addRow([]);
  sheetOverview.addRow(["Normal Form", "Full Name", "Key Principles", "Data Anomaly Prevention", "Applied Status"]);
  const headerRow1 = sheetOverview.getRow(4);
  headerRow1.height = 28;
  headerRow1.eachCell((cell) => Object.assign(cell, headerStyle));

  const overviewData = [
    ["UNF", "Unnormalized Form", "All data stored in a single table, contains repeating groups and non-atomic cells.", "High Data Redundancy & Anomalies", "Initial State"],
    ["1NF", "First Normal Form", "Atomic values (1 cell = 1 value), no repeating groups, Primary Key defined.", "Eliminates multi-valued cells", "Applied"],
    ["2NF", "Second Normal Form", "1NF + Eliminate Partial Dependency (All non-key attributes depend on entire PK).", "Eliminates partial key lookup errors", "Applied"],
    ["3NF", "Boyce-Codd / 3NF", "2NF + Eliminate Transitive Dependency (No non-key attribute depends on another non-key attribute).", "100% Data Integrity & Scalability", "Final Production Schema"],
  ];

  overviewData.forEach((row, idx) => {
    const r = sheetOverview.addRow(row);
    r.height = 22;
    r.eachCell((cell, colIdx) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.border = cellBorder;
      if (idx % 2 === 1) cell.fill = zebraFill;
      if (colIdx === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
      if (colIdx === 5) cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "1F4E78" } };
    });
  });

  autoFitColumns(sheetOverview);

  // ==========================================
  // SHEET 2: UNF (Unnormalized Form)
  // ==========================================
  const sheetUNF = workbook.addWorksheet("UNF (Unnormalized)");
  sheetUNF.views = [{ showGridLines: true }];

  sheetUNF.mergeCells("A1:H1");
  sheetUNF.getCell("A1").value = "🔴 Unnormalized Form (UNF) - Single Table with Repeating Groups";
  sheetUNF.getCell("A1").font = titleStyle.font;

  sheetUNF.addRow([]);
  sheetUNF.addRow(["OrderNo", "Customer/Table", "StaffName", "StaffRole", "OrderItems (Name, Qty, Price)", "CategoryName", "TotalAmount", "OrderDate"]);
  const unfHeader = sheetUNF.getRow(3);
  unfHeader.height = 28;
  unfHeader.eachCell((cell) => Object.assign(cell, headerStyle));

  const unfData = [
    ["ORD-1001", "Table T1", "Super Admin", "Admin Group", "Americano (Qty: 2, Price: $2.00),\nCroissant (Qty: 1, Price: $2.25)", "Coffee,\nFood", 6.25, "2026-09-29"],
    ["ORD-1002", "Table T3", "Super Admin", "Admin Group", "Green Tea (Qty: 1, Price: $2.75),\nCheesecake (Qty: 1, Price: $3.25)", "Tea,\nDessert", 6.00, "2026-09-29"],
  ];

  unfData.forEach((row, idx) => {
    const r = sheetUNF.addRow(row);
    r.height = 36;
    r.eachCell((cell, colIdx) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.border = cellBorder;
      cell.alignment = { vertical: "middle", wrapText: true };
      if (colIdx === 7) cell.numFmt = "$#,##0.00";
    });
  });

  autoFitColumns(sheetUNF);

  // ==========================================
  // SHEET 3: 1NF (First Normal Form)
  // ==========================================
  const sheet1NF = workbook.addWorksheet("1NF (First Normal Form)");
  sheet1NF.views = [{ showGridLines: true }];

  sheet1NF.mergeCells("A1:J1");
  sheet1NF.getCell("A1").value = "🟠 First Normal Form (1NF) - Atomic Values & Flat Table";
  sheet1NF.getCell("A1").font = titleStyle.font;

  sheet1NF.addRow([]);
  sheet1NF.addRow(["OrderId (PK)", "OrderNo", "TableName", "StaffEmail", "ItemName", "CategoryName", "Qty", "UnitPrice", "TotalPrice", "OrderDate"]);
  const header1NF = sheet1NF.getRow(3);
  header1NF.height = 28;
  header1NF.eachCell((cell) => Object.assign(cell, headerStyle));

  const data1NF = [
    [1, "ORD-1001", "Table T1", "cheychon258@gmail.com", "Americano", "Coffee", 2, 2.00, 4.00, "2026-09-29"],
    [1, "ORD-1001", "Table T1", "cheychon258@gmail.com", "Croissant", "Food", 1, 2.25, 2.25, "2026-09-29"],
    [2, "ORD-1002", "Table T3", "cheychon258@gmail.com", "Green Tea", "Tea", 1, 2.75, 2.75, "2026-09-29"],
    [2, "ORD-1002", "Table T3", "cheychon258@gmail.com", "Cheesecake", "Dessert", 1, 3.25, 3.25, "2026-09-29"],
  ];

  data1NF.forEach((row, idx) => {
    const r = sheet1NF.addRow(row);
    r.height = 22;
    r.eachCell((cell, colIdx) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.border = cellBorder;
      cell.alignment = { vertical: "middle" };
      if ([1, 7].includes(colIdx)) cell.alignment = { horizontal: "center", vertical: "middle" };
      if ([8, 9].includes(colIdx)) cell.numFmt = "$#,##0.00";
    });
  });

  autoFitColumns(sheet1NF);

  // ==========================================
  // SHEET 4: 2NF (Second Normal Form)
  // ==========================================
  const sheet2NF = workbook.addWorksheet("2NF (Second Normal Form)");
  sheet2NF.views = [{ showGridLines: true }];

  sheet2NF.mergeCells("A1:F1");
  sheet2NF.getCell("A1").value = "🟡 Second Normal Form (2NF) - Separated Entities";
  sheet2NF.getCell("A1").font = titleStyle.font;

  function addSubTable(ws, title, headers, rows) {
    ws.addRow([]);
    const titleRow = ws.addRow([title]);
    titleRow.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: "1F4E78" } };
    
    const hRow = ws.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((cell) => Object.assign(cell, headerStyle));

    rows.forEach((row, rIdx) => {
      const r = ws.addRow(row);
      r.height = 20;
      r.eachCell((cell, cIdx) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = cellBorder;
        if (rIdx % 2 === 1) cell.fill = zebraFill;
      });
    });
  }

  addSubTable(sheet2NF, "1. User Table", ["id (PK)", "name", "email", "isActive"], [[1, "Super Admin", "cheychon258@gmail.com", true]]);
  addSubTable(sheet2NF, "2. DiningTable Table", ["id (PK)", "name", "capacity", "zone", "qrToken"], [
    [1, "T1", 2, "indoor", "table-t-1"],
    [2, "T2", 2, "indoor", "table-t-2"],
    [3, "T3", 4, "indoor", "table-t-3"],
    [4, "T4", 4, "outdoor", "table-t-4"],
  ]);
  addSubTable(sheet2NF, "3. Product Table (2NF Draft)", ["id (PK)", "name", "categoryName", "basePrice", "trackStock"], [
    [1, "Americano", "Coffee", 2.00, true],
    [2, "Latte", "Coffee", 2.50, true],
    [3, "Green Tea", "Tea", 2.75, true],
    [4, "Croissant", "Food", 2.25, false],
  ]);
  addSubTable(sheet2NF, "4. Order Table", ["id (PK)", "orderNumber", "tableId (FK)", "createdById (FK)", "status", "totalAmount"], [
    [1, "ORD-1001", 1, 1, "completed", 6.25],
    [2, "ORD-1002", 3, 1, "completed", 6.00],
  ]);
  addSubTable(sheet2NF, "5. OrderItem Table", ["id (PK)", "orderId (FK)", "productId (FK)", "quantity", "unitPrice", "totalPrice"], [
    [1, 1, 1, 2, 2.00, 4.00],
    [2, 1, 4, 1, 2.25, 2.25],
    [3, 2, 3, 1, 2.75, 2.75],
  ]);

  autoFitColumns(sheet2NF);

  // ==========================================
  // SHEET 5: 3NF Final Production Schema
  // ==========================================
  const sheet3NF = workbook.addWorksheet("3NF (Full POS Schema)");
  sheet3NF.views = [{ showGridLines: true }];

  sheet3NF.mergeCells("A1:H1");
  sheet3NF.getCell("A1").value = "🟢 Third Normal Form (3NF) - Production POS Database Tables";
  sheet3NF.getCell("A1").font = titleStyle.font;

  addSubTable(sheet3NF, "1. Category Table (`Category`)", ["id (PK)", "name", "slug", "description"], [
    [1, "Coffee", "coffee", "Espresso-based coffee drinks"],
    [2, "Tea", "tea", "Fresh brewed tea beverages"],
    [3, "Frappe", "frappe", "Ice blended frappes"],
    [4, "Food", "food", "Freshly cooked dishes"],
    [5, "Dessert", "dessert", "Bakery and cake slices"],
  ]);

  addSubTable(sheet3NF, "2. Product Table (`Product`)", ["id (PK)", "categoryId (FK)", "name", "basePrice", "unit", "trackStock", "isAvailable"], [
    [1, 1, "Americano", 2.00, "pc", true, true],
    [2, 1, "Latte", 2.50, "pc", true, true],
    [3, 1, "Cappuccino", 2.50, "pc", true, true],
    [4, 2, "Green Tea", 2.75, "pc", true, true],
    [5, 3, "Chocolate Frappe", 3.50, "pc", true, true],
    [6, 4, "Croissant", 2.25, "pc", false, true],
    [7, 5, "Cheesecake", 3.25, "pc", false, true],
  ]);

  addSubTable(sheet3NF, "3. Inventory Table (`Inventory`)", ["id (PK)", "productId (FK & Unique)", "quantity", "minStock"], [
    [1, 1, 50, 10],
    [2, 2, 50, 10],
    [3, 3, 50, 10],
    [4, 4, 50, 10],
    [5, 5, 50, 10],
  ]);

  addSubTable(sheet3NF, "4. Dining Table (`DiningTable`)", ["id (PK)", "name", "capacity", "zone", "qrToken", "isActive"], [
    [1, "T1", 2, "indoor", "table-t-1", true],
    [2, "T2", 2, "indoor", "table-t-2", true],
    [3, "T3", 4, "indoor", "table-t-3", true],
    [4, "T4", 4, "outdoor", "table-t-4", true],
  ]);

  addSubTable(sheet3NF, "5. User Table (`User`)", ["id (PK)", "name", "email", "isActive", "pin"], [
    [1, "Super Admin", "cheychon258@gmail.com", true, "0000"],
  ]);

  addSubTable(sheet3NF, "6. Role/Group Table (`Group`)", ["id (PK)", "name", "description"], [
    [1, "Admin", "Full system administration & configuration access (Super Admin)"],
  ]);

  addSubTable(sheet3NF, "7. User Group Junction Table (`UserGroup`)", ["userId (PK, FK)", "groupId (PK, FK)"], [
    [1, 1],
  ]);

  addSubTable(sheet3NF, "8. Permission Table (`Permission`)", ["id (PK)", "code", "name", "description"], [
    [1, "pos.order.create", "Create Order", "Allows creating new orders in POS"],
    [2, "pos.payment.process", "Process Payment", "Allows processing payments for orders"],
    [3, "pos.reports.view", "View Reports", "Allows viewing sales and analytics reports"],
    [4, "pos.menu.manage", "Manage Menu Catalog", "Allows managing products and categories"],
  ]);

  addSubTable(sheet3NF, "9. Group Permission Junction Table (`GroupPermission`)", ["groupId (PK, FK)", "permissionId (PK, FK)"], [
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
  ]);

  addSubTable(sheet3NF, "10. Header Order Table (`Order`)", ["id (PK)", "orderNumber", "tableId (FK)", "createdById (FK)", "status", "subtotal", "totalAmount", "paymentMethod"], [
    [1, "ORD-20260929-001", 1, 1, "completed", 6.25, 6.25, "cash"],
    [2, "ORD-20260929-002", 3, 1, "completed", 6.00, 6.00, "khqr"],
  ]);

  addSubTable(sheet3NF, "11. Detail Order Item Table (`OrderItem`)", ["id (PK)", "orderId (FK)", "productId (FK)", "quantity", "unitPrice", "totalPrice"], [
    [1, 1, 1, 2, 2.00, 4.00],
    [2, 1, 6, 1, 2.25, 2.25],
    [3, 2, 4, 1, 2.75, 2.75],
    [4, 2, 7, 1, 3.25, 3.25],
  ]);

  autoFitColumns(sheet3NF);

  // Write to Artifacts directory & Workspace root directory for easy download
  const artifactDir = "C:/Users/Cheysochon/.gemini/antigravity/brain/d2645a89-8368-4778-9e9f-cabe453faae8";
  const workspacePath = "d:/Years4-Semeter2/ThesisPosManagerment";

  const artifactFile = path.join(artifactDir, "Thesis_Database_Normalization.xlsx");
  const workspaceFile = path.join(workspacePath, "Thesis_Database_Normalization.xlsx");

  await workbook.xlsx.writeFile(artifactFile);
  await workbook.xlsx.writeFile(workspaceFile);

  console.log("Successfully generated Excel files:");
  console.log("Artifact:", artifactFile);
  console.log("Workspace:", workspaceFile);
}

generateExcel().catch(console.error);
