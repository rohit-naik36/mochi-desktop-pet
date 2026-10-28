# Makes sample-data.js: 12 weeks of made-up team totals for the fictional
# "Acme Demo Pvt Ltd", so Mochi Pulse has something to show before a
# company's real counts arrive. Run: python3 tools/make-sample.py
import json, random, datetime
random.seed(11)
W = 12
start = datetime.date(2026, 8, 3)
weeks = [(start + datetime.timedelta(weeks=i)).isoformat() for i in range(W)]
r5 = lambda v: int(5 * round(v / 5))  # team totals are rounded to the nearest 5

THEMES = ["Deadlines and workload", "Work and colleagues", "Money", "Health and sleep",
          "Relationships", "Self-doubt", "Future and career", "Studies and exams"]
FEATURES = ["Water reminders", "Eye-rest reminders", "Stretch breaks", "Mood check-in", "Worry chat",
            "Focus timer", "Breathing exercise", "Gratitude jar", "Mini games"]

# people, base mood, mood dip per week, late base, break skip, call hours, top theme, feature tilt
def dip(peak, amt):
    return [max(0, amt * (1 - abs(i - peak) / 2.5)) for i in range(W)]
TEAMS = [
    ("Engineering", 120, 3.62, dip(9, .7), .10, .40, 9.5, "Deadlines and workload", {"Focus timer": .2}),
    ("Customer Support", 85, 3.45, dip(6, .12), .07, .58, 15.0, "Work and colleagues", {"Breathing exercise": .1}),
    ("Sales", 60, 3.55, dip(9, .08), .10, .38, 13.5, "Money", {"Worry chat": .08}),
    ("Operations", 70, 3.58, [-.01 * i for i in range(W)], .07, .33, 7.0, "Health and sleep", {"Stretch breaks": .1}),
    ("Finance", 35, 3.56, dip(11, .1), .10, .41, 8.0, "Deadlines and workload", {}),
    ("HR and Admin", 22, 3.66, [-.015 * i for i in range(W)], .05, .29, 10.0, "Work and colleagues", {"Gratitude jar": .15}),
    ("Design", 18, 3.62, dip(7, .05), .14, .36, 6.5, "Self-doubt", {"Mini games": .12}),
    ("Legal", 6, 3.6, [0] * W, .08, .4, 8.0, "Deadlines and workload", {}),  # under 8: hidden
]
MIN_GROUP = 8

weekly, emotions, themes, features = {}, {}, {}, {}
for name, people, base, dp, late0, skip, calls, top, tilt in TEAMS:
    rows, emo = [], []
    for i, wk in enumerate(weeks):
        ramp = min(1, .55 + i * .08)
        active = max(1, round(people * ramp * random.uniform(.78, .88)))
        mood = base + i * .015 - dp[i] * 1.3 + random.uniform(-.04, .04)
        prompted = active * random.randint(19, 22)
        taken = prompted * (1 - skip - dp[i] * .3 + random.uniform(-.02, .02))
        away = taken * (.62 + i * .004 - dp[i] * .4 + random.uniform(-.02, .02))
        late = max(.01, late0 + dp[i] * .45 + random.uniform(-.01, .01))
        rows.append(dict(week=wk, active=r5(active), enrolled=people,
            avg_mood=round(mood, 2), check_ins=r5(active * random.uniform(2.6, 3.1)),
            breaks_prompted=r5(prompted), breaks_taken=r5(taken), breaks_away=r5(away),
            focus_sessions=r5(active * random.uniform(1.4, 1.9)), late_night_share=round(late, 3),
            worry_chats=r5(active * (.35 + dp[i] * .9) * random.uniform(.95, 1.05)),
            support_shown=r5(active * (.06 + dp[i] * .06)),
            call_hours_per_person=round(calls * (1 + i * .02) * random.uniform(.95, 1.05), 1)))
        x = dp[i]
        great, good, low, vlow = .16 + (base - 3.55) * .3 - x * .18, .34 - x * .12, .11 + x * .28, .03 + x * .07
        emo.append(dict(week=wk, great=round(great, 3), good=round(good, 3), okay=round(1 - great - good - low - vlow, 3),
                        low=round(low, 3), very_low=round(vlow, 3)))
    weekly[name], emotions[name] = rows, emo
    sh = {t: random.uniform(.04, .12) for t in THEMES}
    sh[top] += .18
    if name == "Engineering": sh["Health and sleep"] += .05
    tot = sum(sh.values())
    first = {t: v / tot for t, v in sh.items()}
    sh2 = dict(sh); sh2[top] += .08 if max(dp) > .1 else .01
    tot2 = sum(sh2.values())
    themes[name] = [dict(theme=t, first_month=round(first[t], 3), last_month=round(sh2[t] / tot2, 3)) for t in THEMES]
    base_use = [.91, .88, .74, .69, .41, .37, .29, .22, .33]
    features[name] = [dict(feature=f, users=round(min(.98, b + tilt.get(f, 0) + random.uniform(-.05, .05)), 2))
                      for f, b in zip(FEATURES, base_use)]

# Whole company: added up from every team, small ones included.
def all_weekly():
    out = []
    for i, wk in enumerate(weeks):
        rs = [weekly[t[0]][i] for t in TEAMS]
        act = sum(r["active"] for r in rs)
        row = dict(week=wk, enrolled=sum(r["enrolled"] for r in rs), active=act)
        for k in ["check_ins", "breaks_prompted", "breaks_taken", "breaks_away", "focus_sessions", "worry_chats", "support_shown"]:
            row[k] = r5(sum(r[k] for r in rs))
        for k, nd in [("avg_mood", 2), ("late_night_share", 3), ("call_hours_per_person", 1)]:
            row[k] = round(sum(r[k] * r["active"] for r in rs) / act, nd)
        out.append(row)
    return out
weekly["All teams"] = all_weekly()
wt = {t[0]: t[1] for t in TEAMS}; tot = sum(wt.values())
emotions["All teams"] = [dict(week=wk, **{k: round(sum(emotions[t][i][k] * wt[t] for t in wt) / tot, 3)
    for k in ["great", "good", "okay", "low", "very_low"]}) for i, wk in enumerate(weeks)]
themes["All teams"] = [dict(theme=th, **{k: round(sum(themes[t][j][k] * wt[t] for t in wt) / tot, 3)
    for k in ["first_month", "last_month"]}) for j, th in enumerate(THEMES)]
features["All teams"] = [dict(feature=f, users=round(sum(features[t][j]["users"] * wt[t] for t in wt) / tot, 2))
    for j, f in enumerate(FEATURES)]

# Groups under MIN_GROUP people are never shown on their own.
hidden = [t[0] for t in TEAMS if t[1] < MIN_GROUP]
for h in hidden:
    for d in (weekly, emotions, themes, features): del d[h]

# Weekly check-in questions (newest first, like the server) and campaigns.
# A separate random stream, so the numbers above stay the same.
qr = random.Random(23)
QUESTIONS = [
    ("workload-oct", "How manageable was your workload this week?", ["Very", "Mostly", "Not really", "Not at all"], "2026-10-12", "2026-10-18", [.18, .42, .28, .12]),
    ("eap-sep", "Do you know how to reach our EAP if you need it?", ["Yes", "Not sure", "No"], "2026-09-14", "2026-09-20", [.71, .19, .10]),
    ("workload-aug", "How manageable was your workload this week?", ["Very", "Mostly", "Not really", "Not at all"], "2026-08-17", "2026-08-23", [.22, .46, .23, .09]),
]
def answers(people):
    out = []
    for qid, text, opts, start, end, mix in QUESTIONS:
        n = int(people * qr.uniform(.45, .6))
        counts = [r5(n * m * qr.uniform(.85, 1.15)) for m in mix]
        out.append(dict(id=qid, text=text, options=opts, start=start, end=end, answered=r5(n), counts=counts))
    return out
questions = {t[0]: answers(t[1]) for t in TEAMS if t[1] >= MIN_GROUP}
questions["All teams"] = [dict(q, answered=r5(sum(questions[t][i]["answered"] for t in questions)),
    counts=[r5(sum(questions[t][i]["counts"][j] for t in questions)) for j in range(len(q["options"]))])
    for i, q in enumerate(questions["Engineering"])]
campaigns = [
    dict(id="hydrate-aug", theme="hydration", start="2026-08-24", end="2026-08-28", note="Free fruit and infused water in every pantry this week."),
    dict(id="mh-week-oct", theme="mental-health", start="2026-10-05", end="2026-10-10", note="World Mental Health Day: EAP drop-in sessions all week."),
]

data = dict(company="Acme Demo Pvt Ltd", sample=True, minGroup=MIN_GROUP, weeks=weeks,
            teams=[dict(team=t[0], people=t[1], hidden=t[1] < MIN_GROUP) for t in TEAMS],
            weekly=weekly, emotions=emotions, themes=themes, features=features,
            questions=questions, campaigns=campaigns)
open("sample-data.js", "w").write("// Made by tools/make-sample.py. Sample data only, not real people.\nwindow.PULSE_SAMPLE = " + json.dumps(data) + ";\n")
for t in ["Engineering", "Operations", "All teams"]:
    print(t, [r["avg_mood"] for r in weekly[t]])
