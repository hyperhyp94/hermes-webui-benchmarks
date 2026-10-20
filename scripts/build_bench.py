#!/usr/bin/env python3
"""Lädt BenchLM-JSONs (CC BY-NC 4.0, Quelle: benchlm.ai) und schreibt kompakte static/bench.json."""
import json, sys, time, urllib.request, pathlib

BASE = "https://benchlm.ai/data/"
OUT = pathlib.Path(__file__).resolve().parent.parent / "static" / "bench.json"

def get(name):
    req = urllib.request.Request(BASE + name, headers={"User-Agent": "Mozilla/5.0 hermes-bench/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

def main():
    lb, sp, pr = get("leaderboard.json"), get("speed.json"), get("pricing.json")
    models = {}
    def m(slug, name=None, creator=None):
        return models.setdefault(slug, {"n": name, "c": creator})
    for it in lb["items"]:
        e = m(it["slug"], it["model"], it["creator"])
        e["o"] = it.get("displayScore") or it.get("score"); e["r"] = it.get("overallRank")
        e["w"] = it.get("sourceType")
    keymap = {"coding": "co", "agentic": "ag", "reasoning": "re", "knowledge": "kn",
              "math": "ma", "instructionFollowing": "if", "multilingual": "ml"}
    for cat, short in keymap.items():
        for it in lb["categories"].get(cat, []):
            m(it["slug"], it["model"], it["creator"])[short] = it.get("score")
    for it in sp["items"]:
        if it["slug"] in models:
            models[it["slug"]]["t"] = it.get("tokensPerSecond"); models[it["slug"]]["l"] = it.get("ttft")
    for it in pr["items"]:
        if it["slug"] in models:
            models[it["slug"]]["pi"] = it.get("inputPrice"); models[it["slug"]]["po"] = it.get("outputPrice")
    # nur Modelle mit mindestens einem Score
    models = {k: {a: b for a, b in v.items() if b is not None} for k, v in models.items()
              if any(x in v for x in ("o", "co", "ag"))}
    out = {"updated": lb.get("sourceLastUpdated"), "generatedAt": time.strftime("%Y-%m-%d"),
           "source": "Data from BenchLM.ai (CC BY-NC 4.0)", "url": "https://benchlm.ai", "models": models}
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
    print(f"{len(models)} Modelle -> {OUT} ({OUT.stat().st_size//1024} KB), Stand {out['updated']}")

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print("FEHLER:", e, file=sys.stderr); sys.exit(1)
