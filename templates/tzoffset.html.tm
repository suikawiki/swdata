<html t:params="$app $value">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
    <t:my as=$serialized x="
            my $v = $value < 0 ? -$value : $value;
            my $h = int ($v / 3600);
            my $m = int (($v - $h*3600) / 60);
            my $s = $v - $h*3600 - $m*60;
            if ($s == 0) {
              sprintf '%s%02d:%02d',
                  $value < 0 ? '-' : '+',
                  int $h,
                  int $m;
            } else {
              my $x = sprintf '%s%02d:%02d:%02d',
                  $value < 0 ? '-' : '+',
                  int $h,
                  int $m,
                  int $s;
              if ($s) {
                $s -= int $s;
                $s =~ s/^0//;
                $x .= $s;
              }
              $x;
            }
    ">
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value=$serialized> (time zone offset)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <t:my as=$is_integer x="$value == int $value">
  <hgroup>
    <h1><data><t:text value=$serialized></></h1>
    <h2>Time zone offset</h2>
  </>

  <section id=serializations>
    <h1>Serializations</h1>

    <table>
      <tbody>
        <tr>
          <th>Offset
          <td><a pl:href="sprintf '/tzoffset/%s', $serialized" rel=bookmark><data><t:text value="$serialized"></></a>
    </table>
  </section>

  <section id=props>
    <h1>Properties</>

    <table>
      <tbody>
        <tr>
          <th>Seconds
          <td><t:text value="$value">
        <tr>
          <th>Longitude
          <td><m:lon m:value="
            $value * 15 / 3600;
          "/>
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
