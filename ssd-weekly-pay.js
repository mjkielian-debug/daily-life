/* SSD weekly earnings estimate, based on SSD-only hours and route miles entered in the existing UPS shift log. */
(function () {
  "use strict";
  const hourlyRate = 23;
  const mileageRate = 0.706;
  function escText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function moneyText(value) {
    return "$" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function card() {
    if (typeof state === "undefined" || !state || typeof week !== "function") return "";
    const dates = week();
    const rows = (state.workShifts || []).filter(w => dates.includes(w.date) && (String(w.ssdHours ?? "") !== "" || String(w.ssdMiles ?? "") !== ""));
    if (!rows.length) {
      return '<div class="card ssd-weekly-pay-card"><div class="section-title"><div><div class="eyebrow">UPS · Seasonal Support Driver</div><h2>Weekly earnings estimate</h2><div class="muted small">SSD rates: ' + moneyText(hourlyRate) + '/hour + ' + moneyText(mileageRate) + '/mile</div></div><span class="tag">not started</span></div><p class="muted small">Enter SSD delivery hours and route miles in each day’s UPS shift log. Preload hours stay separate, and blank fields stay unknown instead of counting as zero.</p></div>';
    }
    let hours = 0, miles = 0, hoursKnown = 0, milesKnown = 0;
    for (const row of rows) {
      const h = row.ssdHours, m = row.ssdMiles;
      if (h !== "" && h !== null && h !== undefined && Number.isFinite(Number(h)) && Number(h) >= 0) { hours += Number(h); hoursKnown++; }
      if (m !== "" && m !== null && m !== undefined && Number.isFinite(Number(m)) && Number(m) >= 0) { miles += Number(m); milesKnown++; }
    }
    const partial = hoursKnown < rows.length || milesKnown < rows.length;
    const wages = hours * hourlyRate, reimbursement = miles * mileageRate;
    const dayRows = rows.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(row => {
      const hh = row.ssdHours === "" || row.ssdHours == null ? "hours not entered" : Number(row.ssdHours).toFixed(2) + " SSD h";
      const mm = row.ssdMiles === "" || row.ssdMiles == null ? "miles not entered" : Number(row.ssdMiles).toFixed(1) + " mi";
      return '<div class="ssd-weekly-pay-row"><b>' + escText(typeof dl === "function" ? dl(row.date) : row.date) + '</b><span>' + hh + ' · ' + mm + '</span></div>';
    }).join("");
    return '<div class="card ssd-weekly-pay-card"><div class="section-title"><div><div class="eyebrow">UPS · Seasonal Support Driver</div><h2>' + (partial ? "Partial weekly estimate" : "Weekly estimate") + '</h2><div class="muted small">' + hours.toFixed(2) + ' SSD hours · ' + miles.toFixed(1) + ' route miles</div></div><span class="tag">' + (partial ? "some details missing" : "from shift logs") + '</span></div><div class="ssd-weekly-pay-grid"><span><small>Hourly pay estimate</small><b>' + moneyText(wages) + '</b></span><span><small>Mileage pay</small><b>' + moneyText(reimbursement) + '</b></span><span><small>Pay + mileage estimate</small><b>' + moneyText(wages + reimbursement) + '</b></span></div>' + (partial ? '<p class="muted small">This is partial because at least one logged SSD day is missing hours or miles. Add the missing value in that day’s UPS shift log.</p>' : '') + '<details class="compact-more"><summary>Shift details</summary>' + dayRows + '</details><p class="muted small">Uses ' + moneyText(hourlyRate) + '/hour and ' + moneyText(mileageRate) + '/mile. Mileage is separated from wages; estimates are before taxes and do not include any overtime premium.</p></div>';
  }
  window.ssdWeeklyEarningsCard = card;
  const previousIncome = window.moneyIncomeHub;
  if (typeof previousIncome === "function") window.moneyIncomeHub = function () {
    return card() + previousIncome.apply(this, arguments);
  };
  if (!document.getElementById("ssdWeeklyPayStyles")) {
    const style = document.createElement("style");
    style.id = "ssdWeeklyPayStyles";
    style.textContent = ".ssd-weekly-pay-card{display:grid;gap:10px;margin:12px 0;background:linear-gradient(135deg,#f1f8ff,#fff8fc)}.ssd-weekly-pay-card h2{margin:3px 0;font-size:1.18rem}.ssd-weekly-pay-card p{margin:0;line-height:1.45}.ssd-weekly-pay-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ssd-weekly-pay-grid span{display:grid;gap:4px;padding:10px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.45)}.ssd-weekly-pay-grid small{font-size:.67rem;color:var(--muted)}.ssd-weekly-pay-grid b{font-size:.94rem}.ssd-weekly-pay-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--border);font-size:.76rem}.ssd-weekly-pay-row span{text-align:right}@media(max-width:420px){.ssd-weekly-pay-grid{grid-template-columns:1fr}}";
    document.head.appendChild(style);
  }
})();