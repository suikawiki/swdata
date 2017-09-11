<html t:params="$app $tzvalue" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<t:my as=$serialized x="$tzvalue->to_string">
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value=$serialized> (time zone offset)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value=$serialized></></h1>
    <h2><a href=/tzoffset rel=up>Time zone offset</a></h2>
  </>

  <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c $serialized">Notes</a></menu>

  <menu class=toc />

  <section id=serializations>
    <h1>Serializations</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Offset
          <td><a pl:href="sprintf '/tzoffset/%s', $serialized" rel=bookmark><data><t:text value="$serialized"></></a>
    </table>
  </section>

  <section id=props>
    <h1>Properties</>

    <table class=nv>
      <tbody>
        <tr>
          <th>Sign
          <td><m:number m:value="$tzvalue->sign"/>
        <tr>
          <th>Seconds
          <td><t:text value="$tzvalue->seconds">
        <tr>
          <th>Longitude
          <td><m:lon m:value="$tzvalue->longitude->to_deg"/>
    </table>
  </section>

  <section id=cast>
    <h1>Cast</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Number
          <td><m:number m:value="$tzvalue->seconds"/>
    </table>
  </section>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015-2017 Wakaba <wakaba@suikawiki.org>.

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
