<html t:params="$app $value" lang=en>
<t:call x="require SWD::Holidays; require SWD::Eras">
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
              <m:tzoffset m:value="$value->time_zone->offset_as_seconds"/>
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
    <t:my as=$day x="sprintf '%04d-%02d-%02d', $value->year, $value->month, $value->day">
    <h1>Day (<time><t:text value=$day></time>)</h1>

  <section id=calendars>
    <h1>Calendars</h1>

    <t:macro name=gengou-y t:params="$unix $year $context">
      <t:text value="
        my ($era, $era_year) = SWD::Eras::get_era_and_era_year
            ($context, $unix, $year);
        sprintf '%s%s年', $era, $era_year == 1 ? '元' : $era_year;
      ">
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
          <td><t:text value="sprintf '%04d-%02d-%02d', $value->year, $value->month, $value->day">
        <tr>
          <th>Japan
          <td><m:gengou-y m:value=$value m:context="'jp'" m:unix="$value->to_unix_number" m:year="$value->year" /><t:text value="$value->month">月<t:text value="$value->day">日
        <tr>
          <th>Ryuukyuu
          <td><m:gengou-y m:value=$value m:context="'ryuukyuu'" m:unix="$value->to_unix_number" m:year="$value->year" /><t:text value="$value->month">月<t:text value="$value->day">日
        </tr>

        <t:my as=$jul x="
            require POSIX;
            my $jd = $value->to_unix_number / (24*60*60) + 2440587.5;
            my $mjd = $jd - 2400000.5;
            my $n = $mjd + 678883;
            my $e = 4 * $n + 3;
            my $h = 5 * POSIX::floor ( ($e % 1461) / 4 ) + 2;
            my $D = POSIX::floor (($h % 153) / 5) + 1;
            my $M = POSIX::floor ($h / 153) + 3;
            my $Y = POSIX::floor ($e / 1461);
            if ($M > 12) {
              $M -= 12;
              $Y++;
            }
            [$Y, $M, $D];
          ">
        <tr>
          <th rowspan=3>Proleptic Julian calendar
          <th>AD
          <td><a pl:href="'/datetime/julian:' . sprintf '%04d-%02d-%02d', @$jul" rel=bookmark><t:text value="sprintf '%04d-%02d-%02d', @$jul"></a>
        <tr>
          <th>Japan
          <td><a pl:href="'/datetime/julian:' . sprintf '%04d-%02d-%02d', @$jul" rel=bookmark><m:gengou-y m:value=$value m:context="'jp'" m:unix="$value->to_unix_number" m:year="$jul->[0]" /><t:text value="$jul->[1]">月<t:text value="$jul->[2]">日
        <tr>
          <th>Ryuukyuu
          <td><a pl:href="'/datetime/julian:' . sprintf '%04d-%02d-%02d', @$jul" rel=bookmark><m:gengou-y m:value=$value m:context="'ryuukyuu'" m:unix="$value->to_unix_number" m:year="$jul->[0]" /><t:text value="$jul->[1]">月<t:text value="$jul->[2]">日

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
               $value->year, $value->month, $value->day];
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
          <th>Day of week (number)
          <td><t:text value="$value->day_of_week">
        <tr lang=en>
          <th>Day of week (English)
          <td><t:text value="qw(Sunday Monday Tuesday Wednesday Thursday Friday Saturday)[$value->day_of_week]">
        <tr>
          <th>Day of week (日本語)
          <td lang=ja><t:text value="use utf8; qw(日 月 火 水 木 金 土)[$value->day_of_week]">曜日
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

  <section id=year>
    <t:my as=$year x="$value->year">
    <h1>Year (<t:text value="sprintf '%04d', $year">)</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>AD
          <td>
            <t:if x="$year > 0">
              <m:number m:value="$year"/>
            <t:else>
              <m:number m:value="-$year + 1" m:inline=1 /> BC
            </t:if>
        <tr>
          <th lang=ja>神武天皇即位紀元
          <td>
            <m:number m:value="$year + 660"/>
        <tr>
          <th>Proleptic <span lang=ja>明治</span>
          <td>
            <m:number m:value="$year - 1867"/>
        <tr>
          <th>Proleptic <span lang=ja>大正</span>
          <td>
            <m:number m:value="$year - 1911"/>
        <tr>
          <th>Proleptic <span lang=ja>昭和</span>
          <td>
            <m:number m:value="$year - 1925"/>
        <tr>
          <th>Proleptic <span lang=ja>平成</span>
          <td>
            <m:number m:value="$year - 1988"/>
        <tr>
          <th lang=zh>民国紀元
          <td>
            <t:if x="$year >= 1912">
              民国<m:number m:value="$year - 1911" m:inline=1 />年
            <t:else>
              -
            </t:if>
        <tr>
          <th lang=ko>주체력
          <td>
            <t:if x="$year >= 1912">
              <m:number m:value="$year - 1911" m:inline=1 />
            <t:else>
              -
            </t:if>
        <tr>
          <th><span lang=zh>干支</span>
          <td lang=zh>
            <t:text value="qw(庚 辛 壬 癸 甲 乙 丙 丁 戊 己)[$year % 10]"><!--
         --><t:text value="qw(申 酉 戌 亥 子 丑 寅 卯 辰 巳 午 未)[$year % 12]">
    </table>
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
          <td><m:jd m:value="$value->to_unix_number / (24*60*60) + 2440587.5"/>
        <tr>
          <th>Modified Julian Day
          <td><m:mjd m:value="$value->to_unix_number / (24*60*60) + 2440587.5 - 2400000.5"/>
        <tr>
          <th>Rata Die
          <td><m:number m:value="$value->to_unix_number / (24*60*60) + 2440587.5 - 1721424.5"/>
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

    <section id=serializations-browser pl:data-input="$value->to_time_zoned_global_date_and_time_string">
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
            <th><code>toLocaleString</code>
            <td><output/>
          <tr>
            <th><code>toLocaleDateString</code>
            <td><output/>
          <tr>
            <th><code>toLocaleTimeString</code>
            <td><output/>
          <tr>
            <th><code>toJSON</code>
            <td><output/>
      </table>
      <script>
        var section = document.querySelector ('#serializations-browser');
        var date = new Date (section.getAttribute ('data-input'));
        Array.prototype.forEach.call (section.querySelectorAll ('tr'), function (tr) {
          var code = tr.querySelector ('th code');
          var output = tr.querySelector ('output');
          if (!code || !output) return;
          var method = code.textContent;
          output.textContent = date[method] ();
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
