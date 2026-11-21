#!/bin/bash
# الفحص الشامل لـ f1-v4.14: جولة واحدة لكل الاختبارات. الوسيط الأول رقم الجولة (لتمييز المنافذ).
R=/home/claude/repo; B=/home/claude/backup/repo-v4.12-published; N=${1:-1}; P=$((9000 + N * 100)); FAILS=0
run() { local name="$1"; shift; local out; out=$("$@" 2>&1); local code=$?; local last; last=$(echo "$out" | grep -E "PASS|SELFTEST|CONTRAST|coach screens" | tail -1)
  if [ $code -ne 0 ] || echo "$last" | grep -qE "FAIL [1-9]|issue\(s\)" && ! echo "$last" | grep -q "0 issue"; then echo "✗ $name :: $last"; echo "$out" | grep "✗" | head -5; FAILS=$((FAILS+1)); else echo "✓ $name :: $last"; fi; }
cd /home/claude/tests
run "p10 الترقية من f1-v4.12" env NEWVER=f1-v4.14 timeout 400 node p10test.mjs $B $R $((P+1))
run "s1 المحفظة" timeout 300 node s1_wallet.mjs $R $((P+2))
run "s2 العمليات" timeout 300 node s2_ops.mjs $R $((P+3))
run "s3 الرئيسية" timeout 300 node s3_home.mjs $R $((P+4))
run "s4 تحليلاتي" timeout 300 node s4_insights.mjs $R $((P+5))
run "s5 البنية والشروح" timeout 400 node s5_structure.mjs $R $((P+6))
run "الخريطة" timeout 400 node maptest.mjs $R $((P+8))
run "محددات الشروح" timeout 120 node coachsel.mjs
run "النصوص" node texts.mjs $R
run "التباين (صارم)" python3 contrast.py $R --strict
run "العامل الخدمي" timeout 120 node swcache.mjs $R $((P+9))
run "وحدات pulse" node pulse_unit.mjs $R
run "وحدات المحرك" node disc_unit.mjs $R
SELF=$(timeout 120 node selfrun.mjs $R $((P+10)) 2>&1 | tail -1); echo "$SELF" | grep -q "SELFTEST 99/99 \[\] \[\]" && echo "✓ الاختبار الذاتي :: $SELF" || { echo "✗ الاختبار الذاتي :: $SELF"; FAILS=$((FAILS+1)); }
echo "== الجولة $N: $FAILS فشل"; exit $FAILS
