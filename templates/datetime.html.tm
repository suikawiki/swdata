<html t:params="$app $value">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value->to_global_date_and_time_string"> (date and time)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value="$value->to_global_date_and_time_string"></></h1>
    <h2>Date and time</h2>
  </>

  <section id=serializations>
    <h1>Serializations</h1>

    <table>
      <tbody>
        <tr>
          <th>Global date and time string (time zone offset preserved)
          <td><a pl:href="sprintf '/datetime/%s', $value->to_time_zoned_global_date_and_time_string" rel=bookmark><time pl:datetime="$value->to_time_zoned_global_date_and_time_string"><t:text value="$value->to_time_zoned_global_date_and_time_string"></></a>
        <tr>
          <th>Global date and time string (UTC)
          <td><a pl:href="sprintf '/datetime/%s', $value->to_global_date_and_time_string" rel=bookmark><time pl:datetime="$value->to_global_date_and_time_string"><t:text value="$value->to_global_date_and_time_string"></></a>
        <tr>
          <th>Normalized forced-UTC global date and time string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_normalized_forced_utc_global_date_and_time_string" rel=bookmark><time pl:datetime="$value->to_normalized_forced_utc_global_date_and_time_string"><t:text value="$value->to_normalized_forced_utc_global_date_and_time_string"></></a>
        <tr>
          <th>HTTP date
          <td><code><t:text value="$value->to_http_date_string"></code>
        <tr>
          <th>RSS2 date-time
          <td><code><t:text value="$value->to_rss2_date_time_string"></code>
        <tr>
          <th><code>document.lastModified</code> format
          <td><code><t:text value="$value->to_document_last_modified_string"></code>
        <tr>
          <th>Local date and time string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_local_date_and_time_string" rel=bookmark><time pl:datetime="$value->to_local_date_and_time_string"><t:text value="$value->to_local_date_and_time_string"></></a>
        <tr>
          <th>Normalized local date and time string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_normalized_local_date_and_time_string" rel=bookmark><time pl:datetime="$value->to_normalized_local_date_and_time_string"><t:text value="$value->to_normalized_local_date_and_time_string"></></a>
        <tr>
          <th>Date string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_date_string" rel=bookmark><time pl:datetime="$value->to_date_string"><t:text value="$value->to_date_string"></></a>
        <tr>
          <th>Date string with optional time
          <td><a pl:href="sprintf '/datetime/%s', $value->to_date_string_with_optional_time" rel=bookmark><time pl:datetime="$value->to_date_string_with_optional_time"><t:text value="$value->to_date_string_with_optional_time"></></a>
        <tr>
          <th>Year string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_year_string" rel=bookmark><time pl:datetime="$value->to_year_string"><t:text value="$value->to_year_string"></></a>
        <tr>
          <th>Month string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_month_string" rel=bookmark><time pl:datetime="$value->to_month_string"><t:text value="$value->to_month_string"></></a>
        <tr>
          <th>Yearless date string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_yearless_date_string" rel=bookmark><time pl:datetime="$value->to_yearless_date_string"><t:text value="$value->to_yearless_date_string"></></a>
        <tr>
          <th>Week string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_week_string" rel=bookmark><time pl:datetime="$value->to_week_string"><t:text value="$value->to_week_string"></></a>
        <tr>
          <th>Time string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_time_string" rel=bookmark><time pl:datetime="$value->to_time_string"><t:text value="$value->to_time_string"></></a>
        <tr>
          <th>Shortest time string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_shortest_time_string" rel=bookmark><time pl:datetime="$value->to_shortest_time_string"><t:text value="$value->to_shortest_time_string"></></a>
    </table>
  </section>

  <t:my as=$kyuureki x="
    use Kyuureki qw(gregorian_to_kyuureki);
    [gregorian_to_kyuureki $value->year, $value->month, $value->day];
  ">
  <section id=calendars>
    <h1>Calendars</h1>

    <table>
      <tbody>
        <tr>
          <th>Gregorian calendar
          <td><t:text value="sprintf '%04d-%02d-%02d', $value->year, $value->month, $value->day">
        <tr>
          <th><i lang=ja>Kyuureki</i>
          <td>
            <t:if x="defined $kyuureki->[0]">
              <t:attr name="'lang'" value="'ja'">
              <a pl:href="sprintf '/datetime/kyuureki:%04d-%02d%s-%02d',
                              $kyuureki->[0],
                              $kyuureki->[1],
                              $kyuureki->[2] ? q{'} : '',
                              $kyuureki->[3]" rel=bookmark><t:text value="
                sprintf '%s年%s%s月%s日',
                    $kyuureki->[0],
                    $kyuureki->[2] ? '閏' : '',
                    $kyuureki->[1] == 1 ? '正' : $kyuureki->[1],
                    $kyuureki->[3] == 1 ? '朔' : $kyuureki->[3];
              "></a>
            <t:else>
              <t:attr name="'lang'" value="'en'">
              Unknown
            </t:if>
    </table>
  </section>

  <section id=components>
    <h1>Components</>

    <table>
      <tbody>
        <tr>
          <th>Year
          <td><t:text value="$value->year">
        <tr>
          <th>Month
          <td><t:text value="$value->month">
        <tr>
          <th>Day
          <td><t:text value="$value->day">
        <tr>
          <th>Hour
          <td><t:text value="$value->hour">
        <tr>
          <th>Minute
          <td><t:text value="$value->minute">
        <tr>
          <th>Second (integer part)
          <td><t:text value="$value->second">
        <tr>
          <th>Second (fraction part)
          <td><t:text value="'0'.$value->second_fraction_string">
        <tr>
          <th>Time zone offset
          <td>
            <t:if x="defined $value->time_zone">
              <m:tzoffset m:value="$value->time_zone->offset_as_seconds"/>
            <t:else>
              None
            </t:if>
    </table>
  </section>

  <section id=props>
    <h1>Properties</>

    <table>
      <tbody>
        <tr>
          <th>Day of week (number)
          <td><t:text value="$value->day_of_week">
        <tr lang=en>
          <th>Day of week (English)
          <td><t:text value="qw(Sunday Monday Tuesday Wednesday Thursday Friday Saturday)[$value->day_of_week]">
        <tr>
          <th>Day of week (日本語)
          <td lang=ja><t:text value="use utf8; qw(日 月 火 水 木 金 土)[$value->day_of_week]">曜日
        <tr lang=ja>
          <th>六曜
          <td>
            <t:if x="defined $kyuureki->[0]">
              <t:text value="
                use utf8;
                qw(大安 赤口 先勝 友引 先負 仏滅)[($kyuureki->[1] + $kyuureki->[3]) % 6];
              ">
            <t:else>
              <t:attr name="'lang'" value="'en'">
              Unknown
            </t:if>
    </table>
  </section>

  <section id=cast>
    <h1>Cast</>

    <table>
      <tbody>
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
          <th>Day
          <td><m:unixtime m:value="$value->to_unix_number - 24*60*60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 24*60*60" m:formatted=1 />
        <tr>
          <th>Hour
          <td><m:unixtime m:value="$value->to_unix_number - 60*60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 60*60" m:formatted=1 />
        <tr>
          <th>Minute
          <td><m:unixtime m:value="$value->to_unix_number - 60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 60" m:formatted=1 />
    </table>
  </section>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015 Wakaba <wakaba@suikawiki.org>.

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
