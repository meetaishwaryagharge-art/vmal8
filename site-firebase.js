// Shared Firebase connection for ALL public pages (index, about, products, why, contact).
//  1. window.VMFB.save()  -> saves enquiries / orders to Firestore
//  2. Page text           -> reads  content/<page>   (edited in dashboard > Site Content)
//  3. Products            -> reads  products         (edited in dashboard > Products)
// If Firebase cannot load (offline, opened from file://), the pages keep working with their
// built-in text and the forms fall back to opening the visitor's email app.
import { db } from "./firebase-config.js";
import { collection, doc, addDoc, getDoc, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const file = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
const PAGE = { index: "home", about: "about", why: "why", products: "products", contact: "contact" }[file] || "home";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const multi = s => esc(s).replace(/\r?\n/g, "<br>");

/* ---------- 1. save enquiries / orders ---------- */
const str = v => (v == null ? "" : String(v));
window.VMFB = {
  save(kind, d) {
    if (kind === "order") {
      return addDoc(collection(db, "orders"), {
        name: str(d.name), phone: str(d.phone), email: str(d.email),
        address: str(d.address), pincode: str(d.pincode),
        items: (d.items || []).map(i => ({ id: str(i.id), name: str(i.name), size: str(i.size), qty: Number(i.qty) || 1, price: Number(i.price) || 0 })),
        total: Number(d.total) || 0, status: "new", createdAt: serverTimestamp()
      });
    }
    return addDoc(collection(db, "enquiries"), {
      name: str(d.name), phone: str(d.phone), email: str(d.email),
      type: str(d.type), message: str(d.message), status: "new", createdAt: serverTimestamp()
    });
  }
};

/* ---------- 2. page text from Firestore ---------- */
function applyContent(c) {
  const h1 = $("h1");
  if (h1 && c.heading) h1.innerHTML = multi(c.heading);
  if (h1 && c.subheading) {
    const p = h1.parentElement.querySelector("p");
    if (p) p.textContent = c.subheading;
  }
  if (c.body && PAGE === "home") {
    const p = $("section.about p");
    if (p) p.textContent = c.body;
  }
  if (c.email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      if (/^mailto:vmalhomecareproducts@gmail\.com/i.test(a.getAttribute("href"))) {
        a.setAttribute("href", "mailto:" + c.email);
        if (a.textContent.trim().toLowerCase() === "vmalhomecareproducts@gmail.com") a.textContent = c.email;
      }
    });
  }
  if (c.address) {
    document.querySelectorAll(".qc .card").forEach(card => {
      if (card.querySelector("h3")?.textContent.trim() === "Visit Us") {
        const p = card.querySelector("p"); if (p) p.innerHTML = multi(c.address);
      }
    });
  }
  if (c.phone && PAGE === "contact") {
    const row = $(".qc .w"), mail = row && [...row.children].find(x => x.querySelector("h3")?.textContent.trim() === "Customer Care");
    if (mail && !$("#fb-phone-card")) {
      const card = mail.cloneNode(true); card.id = "fb-phone-card";
      card.querySelector("h3").textContent = "Call Us";
      const a = card.querySelector("a.v");
      a.href = "tel:" + c.phone.replace(/[^\d+]/g, ""); a.textContent = c.phone;
      const p = card.querySelector("p"); if (p) p.textContent = "Talk to our team.";
      mail.after(card);
    }
  }
}
getDoc(doc(db, "content", PAGE)).then(s => { if (s.exists()) applyContent(s.data()); }).catch(() => {});

/* ---------- 3. products from Firestore ---------- */
// Original product names, so a dashboard product can be matched to the built-in card.
const ORIG_NAMES = { toilet: "Toilet Cleaner", dish: "Dish Wash Gel", floor: "Floor Cleaner", glass: "Glass Cleaner", phenyl: "Phenyl", mop: "Floor Mop", wiper: "Floor Wiper" };
const low = s => str(s).trim().toLowerCase();
const isOn = p => p.active !== false;
const pct = (p, o) => (o && o > p ? Math.round((o - p) / o * 100) : 0);

function syncProductsPage(list) {
  if (typeof IT === "undefined" || typeof IM === "undefined") return;
  window.__ORIG = window.__ORIG || IT.map(x => ({ ...x }));
  const orig = window.__ORIG, used = new Set(), out = [];
  list.forEach(fp => {
    const key = fp.key || fp.id;
    let base = orig.find(o => o.id === key) || orig.find(o => low(o.name) === low(fp.name));
    if (base && used.has(base.id)) base = null;
    if (base) used.add(base.id);
    if (!isOn(fp)) return;
    const price = Number(fp.price) || 0, old = Number(fp.old) || 0;
    let it;
    if (base) it = { ...base };
    else {
      const k = "fb_" + fp.id;
      IM[k] = fp.imageUrl || "logo.png";
      it = { id: "fb_" + fp.id, img: k, thumbs: [k], desc: fp.short || "", long: fp.short || "", tag: "", bul: [], feat: [], steps: [] };
      if (typeof ICO !== "undefined") ICO[it.id] = "drop";
    }
    if (base && fp.imageUrl) { IM["fb_" + fp.id] = fp.imageUrl; it.img = "fb_" + fp.id; it.thumbs = [it.img]; it.main = null; }
    it.name = fp.name || it.name; it.cat = fp.cat || it.cat; it.short = fp.short || it.short;
    if (fp.short && !base) { it.desc = fp.short; it.long = fp.short; }
    it.price = price; it.old = old > price ? old : price; it.off = pct(price, old);
    out.push(it);
  });
  if (!out.length) return;                       // everything hidden: keep built-in list rather than break the page
  IT.length = 0; out.forEach(x => IT.push(x));
  window.order = IT.slice();
  window.cur = IT.find(x => window.cur && x.id === window.cur.id) || IT[0];
  window.side(); window.grid(false); window.detail(); window.related(); tidyPrices();
  const s = $("#sort"); if (s && s.value && s.value !== "def") s.dispatchEvent(new Event("change"));
}
// "No old price" -> hide the struck-through price and the "0% OFF" badge.
function tidyPrices() {
  document.querySelectorAll("#dbox .price, #track .rc, #grid .pc").forEach(box => {
    box.querySelectorAll("span").forEach(sp => { if (/^0% OFF$/.test(sp.textContent.trim())) sp.style.display = "none"; });
    box.querySelectorAll("s").forEach(s => {
      const b = box.querySelector("b"), pr = box.querySelector(".pr");
      const price = (b && /₹/.test(b.textContent) ? b.textContent : pr ? pr.firstChild?.textContent : "").replace(/\s/g, "");
      if (price && s.textContent.replace(/\s/g, "") === price) s.style.display = "none";
    });
  });
}
function hookRender() {
  ["detail", "related", "grid"].forEach(n => {
    const f = window[n]; if (typeof f !== "function" || f.__fb) return;
    const w = function () { const r = f.apply(this, arguments); tidyPrices(); return r; }; w.__fb = 1; window[n] = w;
  });
}

function syncHome(list) {
  const grid = $("#grid"); if (!grid) return;
  const cards = [...grid.querySelectorAll(".card")];
  const cardName = c => low(c.querySelector("b")?.textContent);
  const used = new Set();
  list.forEach(fp => {
    const key = fp.key || fp.id;
    const names = [low(fp.name), low(ORIG_NAMES[key])].filter(Boolean);
    const card = cards.find(c => !used.has(c) && names.includes(cardName(c)));
    if (card) {
      used.add(card);
      if (!isOn(fp)) { card.style.display = "none"; return; }
      card.style.display = "";
      if (fp.name) card.querySelector("b").textContent = fp.name;
      if (fp.short) card.querySelector("small").textContent = fp.short;
      if (fp.imageUrl) card.querySelector("img").src = fp.imageUrl;
    } else if (isOn(fp) && !grid.querySelector('[data-fb="' + fp.id + '"]')) {
      const tpl = cards.find(c => !c.classList.contains("wide")) || cards[0]; if (!tpl) return;
      const n = tpl.cloneNode(true); n.dataset.fb = fp.id; n.dataset.c = "home"; n.style.display = ""; n.classList.add("on");
      n.querySelector("img").src = fp.imageUrl || "logo.png"; n.querySelector("img").alt = fp.name || "";
      n.querySelector("b").textContent = fp.name || ""; n.querySelector("small").textContent = fp.short || "";
      grid.appendChild(n);
    }
  });
  grid.querySelectorAll("[data-fb]").forEach(n => { if (!list.some(p => p.id === n.dataset.fb && isOn(p))) n.remove(); });
}

if (file === "products" || file === "index") {
  if (file === "products") hookRender();
  onSnapshot(collection(db, "products"), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!list.length) return;                    // nothing imported yet: keep the built-in products
    const order = Object.keys(ORIG_NAMES);        // keep the original product order, new products last
    const rank = p => { let i = order.indexOf(p.key || p.id); if (i < 0) i = order.findIndex(k => low(ORIG_NAMES[k]) === low(p.name)); return i < 0 ? 99 : i; };
    list.sort((a, b) => rank(a) - rank(b) || str(a.name).localeCompare(str(b.name)));
    if (file === "products") syncProductsPage(list); else syncHome(list);
  }, () => {});
}
