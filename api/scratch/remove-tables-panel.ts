import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/tables/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Remove grid columns
content = content.replace(
  /grid min-h-full grid-cols-1 xl:grid-cols-\[1fr_310px\]/g,
  `grid min-h-full grid-cols-1`
);

// 2. Remove recentActivity variable
content = content.replace(
  /\n  const recentActivity = liveOrders\.slice\(0, 4\);\n/g,
  "\n"
);

// 3. Remove the entire <aside> block
// Since replacing large blocks of HTML with regex is tricky, we'll use a string replacement finding the exact start and end of the aside block.
const asideBlockStart = `          {/* Right Column: Setup Card & Live Activity Feed */}`;
const asideBlockEnd = `          </aside>`;

const asideStartIndex = content.indexOf(asideBlockStart);
const asideEndIndex = content.indexOf(asideBlockEnd, asideStartIndex);

if (asideStartIndex !== -1 && asideEndIndex !== -1) {
  content = content.slice(0, asideStartIndex) + content.slice(asideEndIndex + asideBlockEnd.length);
}

// 4. Remove ActivityItem component definition at the end
const activityItemStart = `function ActivityItem({`;
const activityItemIndex = content.indexOf(activityItemStart);
if (activityItemIndex !== -1) {
  // We just trim the rest of the file from ActivityItem to the end, since ActivityItem is the last component
  content = content.slice(0, activityItemIndex);
}

// 5. Remove unused imports (Clock3, Sparkles)
content = content.replace(/  Clock3,\n/g, "");
content = content.replace(/  Sparkles,\n/g, "");

fs.writeFileSync(filePath, content, "utf-8");
console.log("Tables page successfully updated (Sidebar removed)!");
