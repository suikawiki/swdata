<html t:params="$app $value" lang=en>
<t:call x="require SWD::Holidays; require SWD::Eras; use Wanage::URL">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value->to_yearless_date_string"> (Gregorian yearless date)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section id=yearless-date>
  <hgroup>
    <h1><data><t:text value="$value->to_yearless_date_string"></></h1>
    <h2><a href=/datetime/--mm-dd>Gregorian yearless date</a></h2>
  </>

  <menu class=toc />

  <section id=components>
    <h1>Components</>

    <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c $value->to_yearless_date_string">Notes</a></menu>

    <table class="nv">
      <tbody>
        <tr>
          <th>Month
          <td><t:text value="$value->month">
        <tr>
          <th>Day
          <td><t:text value="$value->day">
    </table>
  </section>

  <t:my as=$data x="$SWD::Days::Data->{sprintf '%02d-%02d', $value->month, $value->day}">

  <section id=memorials>
    <h1>Memorial days</h1>
    <ul>
      <t:for as=$item x="[@{$data->{memorials} || []}]">
        <li><a pl:href="'https://ja.wikipedia.org/wiki/' . percent_encode_c ($item->{wref} // $item->{name})" pl:title="$item->{desc}"><t:text value="$item->{name}"></a>
          <t:if x="defined $item->{desc}">
            : <span class=desc><t:text value="$item->{desc}"></>
          </t:if>
      </t:for>
    </ul>
  </section>

  <section id=birthday>
    <h1>Birthday</h1>
    <ul>
      <t:for as=$item x="[@{$data->{birthdays} || []}, @{$data->{fictional_birthdays} || []}]">
        <li><a pl:href="'https://ja.wikipedia.org/wiki/' . percent_encode_c ($item->{wref} // $item->{name})" pl:title="$item->{desc}"><t:text value="$item->{name}"></a>
          <t:if x="defined $item->{date_gregorian}" t:space=preserve>
            (<a pl:href="'/datetime/' . $item->{date_gregorian}"><t:text value="[split /-/, $item->{date_gregorian}]->[0]"></a>)
          </t:if>
      </t:for>
    </ul>
  </section>

  <section id=events>
    <h1>Events</h1>
    <ul>
      <t:for as=$item x="[@{$data->{historicals} || []}, @{$data->{jp_towns} || []}, @{$data->{fictionals} || []}]">
        <li>
          <t:if x="defined $item->{date_gregorian}" t:space=preserve>
            <a pl:href="'/datetime/' . $item->{date_gregorian}"><t:text value="[split /-/, $item->{date_gregorian}]->[0]"></a>:
          </t:if>
          <t:text value="$item->{desc}">
      </t:for>
    </ul>
  </section>

  <section id=serializations>
    <h1>Serialization</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Yearless date string
          <td><a pl:href="sprintf '/datetime/%s', $value->to_yearless_date_string" rel=bookmark><time pl:datetime="$value->to_yearless_date_string"><t:text value="$value->to_yearless_date_string"></></a>
    </table>
  </section>

  <section id=cast>
    <h1>Cast</>

    <table class=nv>
      <tbody>
        <tr>
          <th>Date and time
          <td><m:unixtime m:value="$value->to_unix_number" m:formatted=1 />
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
          <th>100 days
          <td><m:yearless-date m:value="$value->to_unix_number -100*24*60*60"/>
          <td><m:yearless-date m:value="$value->to_unix_number +100*24*60*60"/>
        <tr>
          <th>31 days
          <td><m:yearless-date m:value="$value->to_unix_number - 31*24*60*60"/>
          <td><m:yearless-date m:value="$value->to_unix_number + 31*24*60*60"/>
        <tr>
          <th>30 days
          <td><m:yearless-date m:value="$value->to_unix_number - 30*24*60*60"/>
          <td><m:yearless-date m:value="$value->to_unix_number + 30*24*60*60"/>
        <tr>
          <th>7 days
          <td><m:yearless-date m:value="$value->to_unix_number - 7*24*60*60" />
          <td><m:yearless-date m:value="$value->to_unix_number + 7*24*60*60" />
        <tr>
          <th>A day
          <td><m:yearless-date m:value="$value->to_unix_number - 24*60*60"  />
          <td><m:yearless-date m:value="$value->to_unix_number + 24*60*60"  />
    </table>

    <ul>
      <li><a pl:href="sprintf 'https://en.wikipedia.org/wiki/%s_%d', [undef, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']->[$value->month], $value->day">Wikipedia (English)</a>
      <li><a pl:href="sprintf 'https://ja.wikipedia.org/wiki/%d月%d日', $value->month, $value->day">Wikipedia (日本語)</a>
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
