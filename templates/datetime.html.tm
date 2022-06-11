<html t:params="$app $value" lang=en>
<t:call x="require SWD::Holidays; require SWD::Eras; use Wanage::URL">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value->to_global_date_and_time_string"> (date and time)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1><data><t:text value="$value->to_global_date_and_time_string"></></h1>
    <h2>Date and time</h2>
  </>
  </header>

  <menu class=toc />

  <page-main>

  <section id=components>
    <h1>Components</>

    <table class="nv">
      <tbody>
        <tr>
          <th>Year
          <td><m:year m:value="$value->year"/>
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
              <m:tzoffset m:tzvalue="TZOffset->new_from_seconds ($value->time_zone->offset_as_seconds)"/>
            <t:else>
              None
            </t:if>
    </table>
  </section>

  <t:my as=$kyuureki x="
    use Kyuureki qw(gregorian_to_kyuureki);
    [gregorian_to_kyuureki $value->year, $value->month, $value->day];
  ">
  <section id=day>
    <t:my as=$day x="$value->to_ymd_string">
    <h1>Day (<time><t:text value=$day></time>)</h1>

    <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c $value->to_ymd_string">Notes</a></menu>

  <section id=calendars>
    <h1>Calendars</h1>

    <t:macro name=gengou-y t:params="$unix $year $context $link?">
      <t:my as=$x x="[SWD::Eras::get_era_and_era_year ($context, $unix, $year)]">
      <t:if x=$link>
        <m:era m:key="$x->[0]" m:inline=1 />
      <t:else>
        <t:text value="$x->[0]">
      </t:if><t:text value="$x->[1] == 1 ? '元' : $x->[1]">年
    </>

    <t:macro name=kyuureki-ymd t:params=$value>
      <t:if x="defined $value->[0]">
        <t:attr name="'lang'" value="'ja'">
        <a pl:href="sprintf '/datetime/kyuureki:%04d-%02d%s-%02d',
                    $value->[0],
                    $value->[1],
                    $value->[2] ? q{'} : '',
                    $value->[3]" rel=bookmark><t:text value="
          sprintf '%s年%s%s月%s日',
              $value->[0],
              $value->[2] ? '閏' : '',
              $value->[1] == 1 ? '正' : $value->[1],
              $value->[3] == 1 ? '朔' : $value->[3];
        "></a>
      <t:else>
        <t:attr name="'lang'" value="'en'">
          Unknown
      </t:if>
    </>

    <t:macro name=kyuureki-gengou-ymd t:params="$value $unix $context">
      <t:if x="defined $value->[0]">
        <t:attr name="'lang'" value="'ja'">
        <a pl:href="sprintf '/datetime/kyuureki:%04d-%02d%s-%02d',
                    $value->[0],
                    $value->[1],
                    $value->[2] ? q{'} : '',
                    $value->[3]" rel=bookmark><m:gengou-y m:unix=$unix m:year="$value->[0]" m:context=$context /><t:text value="
          sprintf '%s%s月%s日',
              $value->[2] ? '閏' : '',
              $value->[1] == 1 ? '正' : $value->[1],
              $value->[3] == 1 ? '朔' : $value->[3];
        "></a>
      <t:else>
        <t:attr name="'lang'" value="'en'">
          Unknown
      </t:if>
    </>

    <table class=nnv>
      <tbody>
        <tr>
          <th rowspan=3>Proleptic Gregorian calendar
          <th>AD
          <td><t:text value="$value->to_ymd_string">
        <tr>
          <th>Japan
          <td><m:gengou-y m:value=$value m:context="'jp'" m:unix="$value->to_unix_number" m:year="$value->year" m:link=1 /><t:text value="$value->month">月<t:text value="$value->day">日
        <tr>
          <th>Ryuukyuu
          <td><m:gengou-y m:value=$value m:context="'ryuukyuu'" m:unix="$value->to_unix_number" m:year="$value->year" m:link=1 /><t:text value="$value->month">月<t:text value="$value->day">日
        </tr>

        <tr>
          <th rowspan=3>Proleptic Julian calendar
          <th>AD
          <td><a pl:href="'/datetime/julian:' . $value->to_julian_ymd_string" rel=bookmark><t:text value="$value->to_julian_ymd_string"></a>
        <tr>
          <th>Japan
          <td><a pl:href="'/datetime/julian:' . $value->to_julian_ymd_string" rel=bookmark><m:gengou-y m:value=$value m:context="'jp'" m:unix="$value->to_unix_number" m:year="$value->julian_year" /><t:text value="$value->julian_month">月<t:text value="$value->julian_day">日</a>
        <tr>
          <th>Ryuukyuu
          <td><a pl:href="'/datetime/julian:' . $value->to_julian_ymd_string" rel=bookmark><m:gengou-y m:value=$value m:context="'ryuukyuu'" m:unix="$value->to_unix_number" m:year="$value->julian_year" /><t:text value="$value->julian_month">月<t:text value="$value->julian_day">日</a>

        <tr>
          <th rowspan=3><a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-kyuureki.txt lang=ja><ruby>旧暦<rt>Kyuureki</ruby></a> (Japan)
          <th>AD
          <td><m:kyuureki-ymd m:value=$kyuureki />
        <tr>
          <th>Japan (北朝)
          <td><m:kyuureki-gengou-ymd m:value=$kyuureki m:context="'jp-north'" m:unix="$value->to_unix_number"/>
        <tr>
          <th>Japan (南朝)
          <td><m:kyuureki-gengou-ymd m:value=$kyuureki m:context="'jp-south'" m:unix="$value->to_unix_number"/>
        </tr>

        <t:my as=$rkyuureki x="
          require Kyuureki::Ryuukyuu;
          [Kyuureki::Ryuukyuu::gregorian_to_rkyuureki
              ($value->year, $value->month, $value->day)];
        " />
        <tr>
          <th rowspan=2><a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-kyuureki.txt lang=ja><ruby>旧暦<rt>Kyuureki</ruby></a> (Ryuukyuu)
          <th>AD
          <td><m:kyuureki-ymd m:value=$rkyuureki />
        <tr>
          <th>Ryuukyuu
          <td><m:kyuureki-gengou-ymd m:value=$rkyuureki m:context="'ryuukyuu'" m:unix="$value->to_unix_number"/>
    </table>
  </section>

  <section id=holidays>
    <h1>Holidays</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th lang=ja><a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-holidays.txt>Japan</a>
          <td>
            <t:if x="$SWD::Holidays::JPFlagdays->{$day}">
              <span class=flag>&#x1F1EF;&#x1F1F5;</span>
            </t:if>
            <t:if x="defined $SWD::Holidays::JPHolidays->{$day}">
              <span style=color:red lang=ja>
                <t:text value="$SWD::Holidays::JPHolidays->{$day}">
              </span>
            <t:else>
              <t:if x="$value->year > 1876 or
                     ($value->year == 1876 and $value->month >= 4)">
                <t:if x="$value->day_of_week == 0">
                  <span style=color:red>Sunday</span>
                <t:elsif x="$value->day_of_week == 6">
                  <span style=color:blue>Saturday</span>
                <t:else>
                  Normal day
                </t:if>
              <t:else>
                Normal day
              </t:if>
            </t:if>
        </tr>
        <t:if x="1945 <= $value->year and $value->year <= 1972">
          <tr>
            <th lang=ja><a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-holidays.txt>Ryukyu</a>
            <td>
              <t:if x="defined $SWD::Holidays::RyukyuHolidays->{$day}">
                <span style=color:red lang=ja>
                  <t:text value="$SWD::Holidays::RyukyuHolidays->{$day}">
                </span>
              <t:elsif x="$value->day_of_week == 0">
                <span style=color:red>Sunday</span>
              <t:else>
                Normal day
              </t:if>
        </t:if>
    </table>
  </section>

  <section id=props>
    <h1>Properties</>

    <table class=nv>
      <tbody>
        <tr>
          <th>Yearless date
          <td><m:yearless-date m:value="$value->to_unix_number"/>

        <tr>
          <th>Day of week (number)
          <td><t:text value="$value->day_of_week">
        <tr lang=en>
          <th>Day of week (English)
          <td><t:text value="qw(Sunday Monday Tuesday Wednesday Thursday Friday Saturday)[$value->day_of_week]">
        <tr>
          <th>Day of week (日本語)
          <td lang=ja><t:text value="use utf8; qw(日 月 火 水 木 金 土)[$value->day_of_week]">曜日
          <tr>
            <th><a href=/kanshi>Kanshi</a>
            <td><m:dkanshi m:value="(POSIX::floor ($value->to_jd + 0.5) + 49) % 60"/>
        <tr lang=ja>
          <th>六曜 (Japan)
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

  </section>

  <section id=cast>
    <h1>Cast</>

    <table class=nv>
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
        <tr>
          <th>Julian Day
          <td><m:jd m:value="$value->to_jd"/>
        <tr>
          <th>Julian Day (integer of day)
          <td><m:number m:value="POSIX::floor ($value->to_jd + 0.5)"/>
        <tr>
          <th>Modified Julian Day
          <td><m:mjd m:value="$value->to_mjd"/>
        <tr>
          <th>Rata Die
          <td><m:number m:value="$value->to_rd"/>
    </table>
  </section>

  <section id=serializations>
    <h1>Serializations</h1>

    <table class=nv>
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

    <section id=serializations-browser pl:data-input="$value->to_html_number">
      <h1>Your browser</h1>

      <table class=nv>
        <tbody>
          <tr>
            <th><code>toString</code>
            <td><output/>
          <tr>
            <th><code>toISOString</code>
            <td><output/>
          <tr>
            <th><code>toDateString</code>
            <td><output/>
          <tr>
            <th><code>toTimeString</code>
            <td><output/>
          <tr>
            <th><code>toGMTString</code>
            <td><output/>
          <tr>
            <th><code>toUTCString</code>
            <td><output/>
          <tr>
            <th><code>toJSON</code>
            <td><output/>
      </table>
      <script>
        var section = document.querySelector ('#serializations-browser');
        var date = new Date (parseFloat (section.getAttribute ('data-input')));
        Array.prototype.forEach.call (section.querySelectorAll ('.nv tr'), function (tr) {
          var code = tr.querySelector ('th code');
          var output = tr.querySelector ('output');
          if (!code || !output) return;
          var method = code.textContent;
          try {
            output.textContent = date[method] ();
          } catch (e) {
            output.classList.add ('error');
            output.textContent = e;
          }
        });
      </script>

      <table class=nnv>
        <tbody>
          <t:my as=$locales x="[qw(en en-US en-GB fr fr-CA es es-US it de ja ja-JP ja-JP-u-ca-japanese zh zh-CN zh-TW zh-HK zh-MO zh-SG zh-Hant zh-Hani zh-u-ca-chinese zh-TW-u-ca-roc ko th th-u-ca-buddhist-nu-thai th-u-nu-arab ar-EG ar-SA ar-SA-u-ca-islamic-nu-latn)]">
          <tr>
            <th pl:rowspan=1+@$locales><code>toLocaleString</code>
            <th><m:undefined/>
            <td><output/>
          </tr>
          <t:for as=$locale x=$locales>
            <tr>
              <th><code><t:text value=$locale></code>
              <td pl:lang=$locale><output/>
          </t:for>
          <tr>
            <th><code>toLocaleDateString</code>
            <th><m:undefined/>
            <td><output/>
          <tr>
            <th><code>toLocaleTimeString</code>
            <th><m:undefined/>
            <td><output/>
      </table>
      <script>
        var section = document.querySelector ('#serializations-browser');
        var date = new Date (parseFloat (section.getAttribute ('data-input')));
        var method;
        Array.prototype.forEach.call (section.querySelectorAll ('.nnv tbody tr'), function (tr) {
          var output = tr.querySelector ('output');
          var locale = undefined;
          if (tr.cells.length === 3) {
            var code = tr.cells[0].querySelector ('code');
            if (!code || !output) return;
            method = code.textContent;
            var code = tr.cells[1].querySelector ('code');
            if (code) locale = code.textContent;
          } else {
            var code = tr.cells[0].querySelector ('code');
            if (!code || !output) return;
            locale = code.textContent;
          }
          try {
            output.textContent = date[method] (locale);
          } catch (e) {
            output.classList.add ('error');
            output.textContent = e;
          }
        });
      </script>
    </section>
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
          <th>365 days
          <td><m:unixtime m:value="$value->to_unix_number - 365*24*60*60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 365*24*60*60" m:formatted=1 />
        <tr>
          <th>30 days
          <td><m:unixtime m:value="$value->to_unix_number - 30*24*60*60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 30*24*60*60" m:formatted=1 />
        <tr>
          <th>7 days
          <td><m:unixtime m:value="$value->to_unix_number - 7*24*60*60" m:formatted=1 />
          <td><m:unixtime m:value="$value->to_unix_number + 7*24*60*60" m:formatted=1 />
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

  </page-main>
  <page-side>
    <m:ads />
  </page-side>
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015-2022 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <https://www.gnu.org/licenses/>.

-->
