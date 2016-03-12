<html t:params="$app $era" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$era->{name}"> (Era)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><t:text value="$era->{name}"></h1>
    <h2>Era</h2>
  </>

  <t:my as=$nearby_keys x="SWD::Eras::get_era_keys_by_string ($era->{name})">
  <t:if x="@$nearby_keys > 1">
    <nav class=nearby>
      There are other eras with similar name:
      <ul>
        <t:for as=$key x="[grep { $_ ne $era->{key} } @$nearby_keys]">
          <li><m:era m:key=$key />
        </t:for>
      </ul>
    </nav>
  </t:if>

    <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c ($era->{suikawiki} // $era->{name})">Notes</a></menu>

  <menu class=toc />

  <section id=ids>
    <h1>Identifiers</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>ID
          <td><m:number m:value="$era->{id}"/>
        <tr>
          <th><a href=https://manakai.github.io/spec-datetime/#era-key>Key</a>
          <td><code><t:text value="$era->{key}"></code>
        </tr>
        <t:for as=$d x="[
          ['name', 'Name', undef],
          ['name_ja', 'Name (日本語)', 'ja'],
          ['name_kana', 'Name (読み仮名)', 'ja-Hira'],
          ['name_cn', 'Name (简体中文)', 'zh-cn'],
          ['name_tw', 'Name (正體中文)', 'zh-tw'],
          ['name_ko', 'Name (한국어)', 'ko'],
          ['name_vi', 'Name (Tiếng Việt)', 'vi'],
          ['name_en', 'Name (Latin)', undef],
          ['short_name', 'Short form', undef],
          ['abbr', 'Abbreviated form', undef],
          ['abbr_latn', 'Abbreviated form (Latin)', undef],
        ]">
          <t:if x="defined $era->{$d->[0]}">
            <tr>
              <th><t:text value="$d->[1]">
              <td pl:lang="$d->[2]"><t:text value="$era->{$d->[0]}">
          </t:if>
        </t:for>
        <t:if x="keys %{$era->{names}} > 1">
          <tr>
            <th>Names
            <td>
              <t:for as=$s x="[keys %{$era->{names}}]" t:space=preserve>
                <data><t:text value=$s></data>
              </t:for>
        </t:if>
        <t:if x="keys %{$era->{name_kanas} or {}} > 1">
          <tr>
            <th>Names (読み仮名)
            <td>
              <t:for as=$s x="[keys %{$era->{name_kanas}}]" t:space=preserve>
                <data><t:text value=$s></data>
              </t:for>
        </t:if>
    </table>
  </section>

  <section id=categories>
    <h1>Categories</h1>

    <ul>
      <t:for as=$cat x="[
        ['jp_era', 'Japan'],
        ['jp_north_era', 'Japan (北朝)'],
        ['jp_south_era', 'Japan (南朝)'],
        ['cn_ryuukyuu_era', 'Chinese era used in Ryuukyuu, Japan'],
        ['jp_emperor_era', 'Earlier emperor era of Japan'],
        ['jp_private_era', 'Unofficial era in Japan'],
      ]">
        <t:if x="$era->{$cat->[0]}">
          <li><t:text value="$cat->[1]">
        </t:if>
      </t:for>
    </ul>
  </section>

  <section id=years>
    <h1>Years</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>First year
          <td>
            <t:if x="defined $era->{offset}">
              <m:year m:value="$era->{offset} + 1" />
            <t:else>
              Unknown
            </t:if>
        </tr>
        <t:for as=$g x="[
          ['', ''],
          ['north_', ' (北朝)'],
          ['south_', ' (南朝)'],
        ]">
          <t:if x="defined $era->{$g->[0].'start_year'}">
            <tr>
              <th>Year of start<t:text value="$g->[1]">
              <td><m:year m:value="$era->{$g->[0].'start_year'}"/>
          </t:if>
          <t:if x="defined $era->{$g->[0].'end_year'}">
            <tr>
              <th>Year of end<t:text value="$g->[1]">
              <td><m:year m:value="$era->{$g->[0].'end_year'}"/>
          </t:if>
          <t:if x="defined $era->{$g->[0].'start_day'}">
            <tr>
              <th>Day of start<t:text value="$g->[1]">
              <td><m:day m:value="$era->{$g->[0].'start_day'}->{gregorian}"/>
          </t:if>
          <t:if x="defined $era->{$g->[0].'end_day'}">
            <tr>
              <th>Day of end<t:text value="$g->[1]">
              <td><m:day m:value="$era->{$g->[0].'end_day'}->{gregorian}"/>
          </t:if>
        </t:for>
    </table>

    <t:my as=$start_year x="$era->{start_year} // $era->{north_start_year} // $era->{south_start_year} // (defined $era->{offset} ? $era->{offset}+1 : undef)">
    <t:my as=$end_year x="$era->{end_year} // $era->{north_end_year} // $era->{south_end_year} // $start_year">
    <t:if x="defined $start_year and defined $end_year and defined $era->{offset}">
      <table class=years>
        <tbody>
          <t:for as=$year x="[$start_year..$end_year]">
            <tr>
              <th>
                <t:my as=$y x="$year - $era->{offset}">
                <t:text value="$era->{name}"><t:text value="$y == 1 ? '元' : $y">年
              <td><m:era m:key="'AD'" m:text="'AD'" m:inline=1 /><m:year m:value=$year m:inline=1 />
              <td><m:era m:key="'神武天皇'" m:text="'皇紀'" m:inline=1 /><m:number m:value="$year+660" m:inline=1 />
              <td><m:ykanshi m:year=$year />
          </t:for>
      </table>
    </t:if>
  </section>

  <section id=links>
    <h1>Links</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>SuikaWiki
          <td><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c ($era->{suikawiki} // $era->{name})"><t:text value="$era->{suikawiki} // $era->{name}"></a>
        <tr>
          <th>Wikipedia
          <td>
            <t:if x="defined $era->{wref_ja}">
              <a pl:href="'https://ja.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $era->{wref_ja}" lang=ja>日本語</a>
            </t:if>
            <t:if x="defined $era->{wref_zh}">
              <a pl:href="'https://zh.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $era->{wref_zh}" lang=zh>中文</a>
            </t:if>
            <t:if x="defined $era->{wref_ko}">
              <a pl:href="'https://ko.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $era->{wref_ko}" lang=ko>한국어</a>
            </t:if>
            <t:if x="defined $era->{wref_en}">
              <a pl:href="'https://en.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $era->{wref_en}" lang=en>English</a>
            </t:if>
    </table>
  </section>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <http://www.gnu.org/licenses/>.

-->
