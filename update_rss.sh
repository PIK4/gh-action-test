#!/usr/bin/env sh

set -xe
curl -s -o rss/soso_no_frieren.rss.xml "https://www.dmhy.org/topics/rss/rss.xml?keyword=%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2&team_id=816&order=date-desc"
curl -s -o rss/jujutsu_kaisen.rss.xml "https://www.dmhy.org/topics/rss/rss.xml?keyword=jujutsu+kaisen&sort_id=0&team_id=657&order=date-desc"
curl -s -o rss/spy_family_s02.rss.xml "https://www.dmhy.org/topics/rss/rss.xml?keyword=spy+family+Season+2+%E7%AE%80%E4%BD%93%E5%86%85%E5%B5%8C&sort_id=0&team_id=619&order=date-desc"
