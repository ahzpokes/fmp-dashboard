import json, csv

with open('traffic_data.json', encoding='utf-8') as f:
    data = json.load(f)

ACC = 'REIMS ACC'
adata = data[ACC]

# ---------- 1) CSV annuel ----------
with open('reims_annual.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow([
        'acc','week','flights','flights_previous_year',
        'delay_capacity_staffing','delay_weather','delay_other',
        'delay_disruption','delay_total',
        'delay_prev_capacity_staffing','delay_prev_weather','delay_prev_other',
        'delay_prev_disruption','delay_prev_total'
    ])
    ann = adata['annual']
    for i, wk in enumerate(ann['weeks']):
        w.writerow([
            ACC, wk,
            ann['flights'][i], ann['flightsPreviousYear'][i],
            ann['delays']['capacityStaffing'][i],
            ann['delays']['weather'][i],
            ann['delays']['other'][i],
            ann['delays']['disruption'][i],
            ann['delays']['total'][i],
            ann['delaysPreviousYear']['capacityStaffing'][i],
            ann['delaysPreviousYear']['weather'][i],
            ann['delaysPreviousYear']['other'][i],
            ann['delaysPreviousYear']['disruption'][i],
            ann['delaysPreviousYear']['total'][i],
        ])

# ---------- 2) CSV journalier ----------
with open('reims_daily.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow([
        'acc','week','day','date','flights','flights_previous_year',
        'delay_capacity_staffing','delay_weather','delay_other',
        'delay_disruption','delay_total'
    ])
    for week_num, wk in adata['weekly'].items():
        for j in range(7):
            if not wk['dates'][j]:
                continue
            w.writerow([
                ACC, week_num, wk['days'][j], wk['dates'][j],
                wk['flights'][j], wk['flightsPreviousYear'][j],
                wk['delays']['capacityStaffing'][j],
                wk['delays']['weather'][j],
                wk['delays']['other'][j],
                wk['delays']['disruption'][j],
                wk['delays']['total'][j],
            ])

print("OK : reims_annual.csv et reims_daily.csv générés")