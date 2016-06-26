<html t:params="$app $value" lang=en>
<t:call x="require SWD::Holidays; require SWD::Eras; use Wanage::URL">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value->to_manakai_year_string"> (Year)
  </t:include>
  <link rel=canonical pl:href="'/year/' . $value->to_manakai_year_string">
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value="$value->to_manakai_year_string"></></h1>
    <h2><a href=/year rel=up>Year</a></h2>
  </>

  <menu class=toc />

  <section id=year>
    <t:my as=$year x="$value->year">
    <h1>Year (<t:text value="$value->to_manakai_year_string">)</h1>

    <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c $value->to_manakai_year_string">Notes</a></menu>

    <t:macro name=gengou-y t:params="$unix $year $context $link?">
      <t:my as=$x x="[SWD::Eras::get_era_and_era_year ($context, $unix, $year)]">
      <t:if x=$link>
        <m:era m:key="$x->[0]" m:inline=1 />
      <t:else>
        <t:text value="$x->[0]">
      </t:if><t:text value="$x->[1] == 1 ? '元' : $x->[1]">年
    </>

    <table class=nv>
      <tbody>
        <tr>
          <th><m:era m:key="'AD'"/>
          <td>
            <t:if x="$year > 0">
              <m:number m:value="$year"/>
            <t:else>
              <m:number m:value="-$year + 1" m:inline=1 /> BC
            </t:if>
        <tr>
          <th lang=ja><m:era m:key="'神武'" m:text="'神武天皇即位紀元'"/>
          <td>
            <m:number m:value="$year + 660"/>
        <tr>
          <th><m:era-system m:key="'jp-north'" m:text="'Japan (北朝)'"/>
          <td><m:gengou-y m:value=$value m:context="'jp-north'" m:unix="$value->to_unix_number" m:year="$value->year" m:link=1 />
        <tr>
          <th><m:era-system m:key="'jp-south'" m:text="'Japan (南朝)'"/>
          <td><m:gengou-y m:value=$value m:context="'jp-south'" m:unix="$value->to_unix_number" m:year="$value->year" m:link=1 />
        <tr>
          <th><m:era-system m:key="'ryuukyuu'" m:text="'Ryuukyuu'"/>
          <td><m:gengou-y m:value=$value m:context="'ryuukyuu'" m:unix="$value->to_unix_number" m:year="$value->year" m:link=1 />
        <tr>
          <th><m:era m:key="'明治'"/>
          <td>
            <m:number m:value="$year - 1867"/>
        <tr>
          <th><m:era m:key="'大正'"/>
          <td>
            <m:number m:value="$year - 1911"/>
        <tr>
          <th><m:era m:key="'昭和'"/>
          <td>
            <m:number m:value="$year - 1925"/>
        <tr>
          <th><m:era m:key="'平成'"/>
          <td>
            <m:number m:value="$year - 1988"/>
        <tr>
          <th lang=zh><m:era m:key="'民国紀元'" m:text="'中華民國紀元'"/>
          <td>
            <m:number m:value="$year - 1911" />
        <tr>
          <th lang=ko><m:era m:key="'主体'"/>
          <td>
            <m:number m:value="$year - 1911"  />
        <tr>
          <th><a href=/kanshi lang=zh>干支</a>
          <td lang=zh>
            <m:ykanshi m:year=$year />
    </table>
  </section>

  <section id=serializations>
    <h1>Serialization</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Year string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_year_string" rel=bookmark><time pl:datetime="$value->to_year_string"><t:text value="$value->to_year_string"></></a>
    </table>
  </section>

  <section id=months>
    <h1>Months (Gregorian calendar)</h1>

    <ul class=item-list>
      <t:for as=$m x="[1..12]">
        <li><m:yearmonth m:year="$value->year" m:month=$m />
      </t:for>
    </ul>
  </section>

  <section id=cast>
    <h1>Cast</>

    <table class=nv>
      <tbody>
        <tr>
          <th>Date and time
          <td><m:unixtime m:value="$value->to_unix_number" m:formatted=1 />
        <tr>
          <th>Year number
          <td><m:number m:value="$value->year"/>
        <tr>
          <th>Unix number
          <td><m:number m:value="$value->to_unix_number"/>
        <tr>
          <th>Unix integer
          <td><m:number m:value="$value->to_unix_integer"/>
        <tr>
          <th>HTML number
          <td><m:number m:value="$value->to_html_number"/>
        <tr>
          <th>HTML month number
          <td><m:number m:value="$value->to_html_month_number"/>
        <tr>
          <th>Julian Day
          <td><m:jd m:value="$value->to_jd"/>
        <tr>
          <th>Modified Julian Day
          <td><m:mjd m:value="$value->to_mjd"/>
        <tr>
          <th>Rata Die
          <td><m:number m:value="$value->to_rd"/>
    </table>
  </section>

  <section id=links>
    <h1>Links</h1>

    <table>
      <thead>
        <tr>
          <th>
          <th>Previous
          <th>Next
      <tbody>
        <tr>
          <th>A year
          <td><m:year m:value="$value->year - 1"/>
          <td><m:year m:value="$value->year + 1"/>
        <tr>
          <th>100 years
          <td><m:year m:value="$value->year - 100"/>
          <td><m:year m:value="$value->year + 100"/>
        <tr>
          <th>1000 years
          <td><m:year m:value="$value->year - 1000"/>
          <td><m:year m:value="$value->year + 1000"/>
    </table>

    <ul>
      <li><a pl:href="sprintf 'https://en.wikipedia.org/wiki/%d', $value->year">Wikipedia (English)</a>
      <li><a pl:href="sprintf 'https://ja.wikipedia.org/wiki/%d年', $value->year">Wikipedia (日本語)</a>
    </ul>
  </section>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015-2016 Wakaba <wakaba@suikawiki.org>.

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
