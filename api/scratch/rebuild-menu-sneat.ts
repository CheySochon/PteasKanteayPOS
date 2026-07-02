import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// --- CATEGORIES REDESIGN ---
const oldCategoryArticle = `className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"`;
const newCategoryArticle = `className="rounded border border-[#d9dee3] dark:border-[#4e4f6e] bg-white dark:bg-[#2b2c40] p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#696cff]/40"`;
content = content.replace(oldCategoryArticle, newCategoryArticle);

const oldCategoryIcon = `className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"`;
const newCategoryIcon = `className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-[#696cff]/10 text-[#696cff]"`;
content = content.replace(oldCategoryIcon, newCategoryIcon);

const oldCategoryTitle = `className="truncate text-base font-black text-slate-950"`;
const newCategoryTitle = `className="truncate text-base font-bold text-[#566a7f] dark:text-[#c9d4ea]"`;
content = content.replace(oldCategoryTitle, newCategoryTitle);

const oldCategorySubtitle = `className="mt-1 text-xs font-bold uppercase text-slate-400"`;
const newCategorySubtitle = `className="mt-1 text-xs font-semibold uppercase text-[#a1acb8]"`;
content = content.replace(oldCategorySubtitle, newCategorySubtitle);

const oldCategoryEditBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-700"`;
const newCategoryEditBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded text-[#a1acb8] hover:bg-[#696cff]/10 hover:text-[#696cff] transition-colors"`;
content = content.replace(oldCategoryEditBtn, newCategoryEditBtn);

const oldCategoryDelBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"`;
const newCategoryDelBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded text-[#a1acb8] hover:bg-[#ff3e1d]/10 hover:text-[#ff3e1d] transition-colors"`;
content = content.replace(oldCategoryDelBtn, newCategoryDelBtn);

const oldCategoryDesc = `className="mt-4 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-500"`;
const newCategoryDesc = `className="mt-4 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[#8592a3]"`;
content = content.replace(oldCategoryDesc, newCategoryDesc);


// --- MENUCARD REDESIGN ---
const oldMenuCardWrapper = `className="overflow-hidden rounded bg-white dark:bg-[#2b2c40] border border-[#e5e7eb] dark:border-[#4e4f6e] shadow-sm flex flex-col justify-between"`;
const newMenuCardWrapper = `className="overflow-hidden rounded bg-white dark:bg-[#2b2c40] border border-[#d9dee3] dark:border-[#4e4f6e] shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#696cff]/30 group"`;
content = content.replace(oldMenuCardWrapper, newMenuCardWrapper);

const oldMenuTitle = `className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight"`;
const newMenuTitle = `className="truncate text-sm font-bold text-[#566a7f] dark:text-[#c9d4ea] leading-tight group-hover:text-[#696cff] transition-colors"`;
content = content.replace(oldMenuTitle, newMenuTitle);

const oldMenuCategory = `className="mt-1 truncate text-xs font-semibold text-slate-400"`;
const newMenuCategory = `className="mt-1 truncate text-xs font-semibold text-[#a1acb8]"`;
content = content.replace(oldMenuCategory, newMenuCategory);

const oldEyeBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#eceef1]/60 hover:text-slate-700 transition-all"`;
const newEyeBtn = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#eceef1]/60 hover:text-[#566a7f] transition-all dark:hover:bg-slate-700 dark:hover:text-[#c9d4ea]"`;
content = content.replace(oldEyeBtn, newEyeBtn);

const oldEditBtnMenu = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#eceef1]/60 hover:text-[#696cff] transition-all"`;
const newEditBtnMenu = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#696cff]/10 hover:text-[#696cff] transition-all"`;
content = content.replace(oldEditBtnMenu, newEditBtnMenu);

const oldDelBtnMenu = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-red-50 hover:text-[#ff3e1d] transition-all"`;
const newDelBtnMenu = `className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#ff3e1d]/10 hover:text-[#ff3e1d] transition-all"`;
content = content.replace(oldDelBtnMenu, newDelBtnMenu);

const oldImgContainer = `className="relative aspect-[1.2] bg-slate-100 dark:bg-[#232333] overflow-hidden"`;
const newImgContainer = `className="relative aspect-[1.3] bg-[#f5f5f9] dark:bg-[#232333] overflow-hidden"`;
content = content.replace(oldImgContainer, newImgContainer);

const oldBorderTop = `className="px-4 pb-4 pt-2 border-t border-[#f0f2f5] dark:border-[#4e4f6e]"`;
const newBorderTop = `className="px-4 pb-4 pt-2 border-t border-[#d9dee3] dark:border-[#4e4f6e]"`;
content = content.replace(oldBorderTop, newBorderTop);


fs.writeFileSync(filePath, content, "utf-8");
console.log("Menu page successfully updated with Sneat UI specs!");
