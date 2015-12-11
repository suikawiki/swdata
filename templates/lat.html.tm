<html t:params="$app $value" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value"> (latitude)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value="$value"></></h1>
    <h2>Latitude</h2>
  </>

  <section id=serializations>
    <h1>Serializations</>

    <table class=nv>
      <tbody>
        <tr>
          <th>DEG
          <td><a pl:href="sprintf '/lat/%f', $value" rel=bookmark><t:text value="sprintf '%f', $value"></a>
        </tr>
        <t:my as=$dms x="
          my $v = $value > 0 ? $value : -$value;
          my $w = ($v - int $v) * 60;
          [$value < 0 ? -1 : 1, int $v, int $w, ($w - int $w) * 60];
        ">
        <tr lang=en>
          <th>DMS (English)
          <td><a pl:href="sprintf '/lat/%d.%d.%f%s', $dms->[1], $dms->[2], $dms->[3], $dms->[0] < 0 ? 'S' : 'N'" rel=bookmark><t:text value="
            sprintf q{%s° %s' %s'' %s},
                $dms->[1],
                $dms->[2],
                ($dms->[3] == int $dms->[3] ? sprintf '%d', $dms->[3] : sprintf '%f', $dms->[3]),
                $dms->[0] < 0 ? 'S' : 'N';
          "></a>
        <tr lang=ja>
          <th>DMS (日本語)
          <td><a pl:href="sprintf '/lat/%d.%d.%f%s', $dms->[1], $dms->[2], $dms->[3], $dms->[0] < 0 ? 'S' : 'N'" rel=bookmark><t:text value="
            sprintf q{%s%s度%s分%s秒},
                $dms->[0] < 0 ? '南緯' : '北緯',
                $dms->[1],
                $dms->[2],
                ($dms->[3] == int $dms->[3] ? sprintf '%d', $dms->[3] : sprintf '%f', $dms->[3]);
          "></a>
    </table>
  </section>

  <section id=cast>
    <h1>Cast</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Number
          <td><m:number m:value="$value"/>
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
