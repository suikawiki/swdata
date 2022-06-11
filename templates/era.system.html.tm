<html t:params="$app $system $key" lang=en>
<t:call x="use Kyuureki">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$key"> (Era system)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1><code><t:text value="$key"></></h1>
    <h2>Era system</h2>
  </>
  </header>

  <menu class=toc />

  <page-main>
  <section id=ids>
    <h1>Identifier</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Key
          <td><code><t:text value="$key"></code>
    </table>
  </section>

  <section id=eras>
    <h1>Eras</h1>

    <t:macro name=day-cells t:params="$era $type $value $day_delta?">
      <td>
        <t:my as=$day>
        <t:if x="$type eq 'jd'">
          <t:call x="$day = Web::DateTime->new_from_jd ($value - ($day_delta || 0))">
        <t:elsif x="$type eq 'y'">
          <t:call x="$day = Web::DateTime->new_from_components ($value, 1, 1 - ($day_delta || 0))">
        </t:if>
        <a pl:href="'/datetime/'.$day->to_ymd_string" class=inline>
          <t:if x="defined $era and defined $era->{offset}">
            <t:text value="
              my $y = $day->year - $era->{offset};
              $y == 1 ? '元' : $y;
            "> (AD<t:text value="$day->year">)
          <t:else>
            AD<t:text value="$day->year">
          </t:if>
          /
          <t:text value="$day->month">
          /
          <t:text value="$day->day">
        </a>
      </td>
      <t:if x="$type eq 'jd'"><td>=</td><t:else><td/></t:if>
      <td>
        <t:my as=$day>
        <t:if x="$type eq 'jd'">
          <t:call x="$day = Web::DateTime->new_from_jd ($value - ($day_delta || 0))">
        <t:elsif x="$type eq 'y'">
          <t:call x="$day = Web::DateTime::Parser->parse_julian_ymd_string (sprintf '%04d-%02d-%02d', $value, 1, 1 - ($day_delta || 0))">
        </t:if>
        <a pl:href="'/datetime/julian:'.$day->to_julian_ymd_string" class=inline>
          <t:if x="defined $era and defined $era->{offset}">
            <t:text value="
              my $y = $day->julian_year - $era->{offset};
              $y == 1 ? '元' : $y;
            "> (AD<t:text value="$day->julian_year">)
          <t:else>
            AD<t:text value="$day->julian_year">
          </t:if>
          /
          <t:text value="$day->julian_month">
          /
          <t:text value="$day->julian_day">
        </a>
      <t:if x="$type eq 'jd'"><td>=</td><t:else><td/></t:if>
      <td>
        <t:my as=$kyuureki>
        <t:if x="$type eq 'jd'">
          <t:call x="
            my $value = Web::DateTime->new_from_jd ($value - ($day_delta || 0));
            $kyuureki = [gregorian_to_kyuureki $value->year, $value->month, $value->day];
          ">
        <t:elsif x="$type eq 'y'">
          <t:call x="
            my $value = Web::DateTime->new_from_components
                (kyuureki_to_gregorian $value, 1, 0, 1 - ($day_delta || 0));
            $kyuureki = [gregorian_to_kyuureki $value->year, $value->month, $value->day];
          ">
        </t:if>
        <a pl:href="'/datetime/kyuureki:'.sprintf '%04d-%02d%s-%02d', $kyuureki->[0], $kyuureki->[1], $kyuureki->[2]?q{'}:'', $kyuureki->[3]" class=inline>
          <t:if x="defined $era and defined $era->{offset}">
            <t:text value="
              my $y = $kyuureki->[0] - $era->{offset};
              $y == 1 ? '元' : $y;
            "> (AD<t:text value="$kyuureki->[0]">)
          <t:else>
            AD<t:text value="$kyuureki->[0]">
          </t:if>
          /
          <t:text value="($kyuureki->[2] ? '閏' : '') . ($kyuureki->[1] == 1 ? '正' : $kyuureki->[1])">
          /
          <t:text value="$kyuureki->[3] == 1 ? '朔' : $kyuureki->[3]">
        </a>
      </td>
    </t:macro>

    <table>
      <thead>
        <tr>
          <th>Era
          <th>Gregorian
          <th/>
          <th>Julian
          <th/>
          <th>Kyuureki
      <tbody>
        <t:my as=$prev_era>
        <t:for as=$point x="$system->{points}">
          <t:if x="defined $prev_era">
            <tr>
              <td colspan=5>:
            <tr>
              <m:day-cells m:era=$prev_era m:type="$point->[0]" m:value="$point->[1]" m:day_delta=1 />
          </t:if>
          <tr>
            <th>
              <t:if x="defined $point->[2]">
                <t:attr name="'rowspan'" value=3>
                <m:era m:key="$point->[2]"/>
              <t:else>
                None
              </t:if>
            </th>
            <m:day-cells m:era="$prev_era = $SWD::Eras::Defs->{eras}->{$point->[2] // ''} # or undef" m:type="$point->[0]" m:value="$point->[1]" />
        </t:for>
        <t:if x="defined $prev_era">
          <tr>
            <td colspan=5>:
          <tr>
            <m:day-cells m:era=$prev_era m:type="'jd'" m:value="Web::DateTime->new_from_unix_time (time)->to_jd" />
          <tr>
            <td colspan=6>Now
        </t:if>
    </table>
  </section>

  </page-main>

  <page-side>
    <m:ads />
  </page-side>
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016-2022 Wakaba <wakaba@suikawiki.org>.

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
