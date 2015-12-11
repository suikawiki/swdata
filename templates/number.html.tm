<html t:params="$app $value">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value=$value> (number)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <t:my as=$is_integer x="$value == int $value">
  <hgroup>
    <h1><data><t:text value=$value></></h1>
    <h2>Number</h2>
  </>

  <table>
    <tbody>
      <tr>
        <th>Decimal
        <td><a pl:href="sprintf '/number/%d', $value" rel=bookmark><data><t:text value="sprintf '%d', $value"></></a>
      <tr>
        <th>Hexadecimal
        <td><a pl:href="sprintf '/number/0x%X', $value" rel=bookmark><data><t:text value="sprintf '%X', $value"></></a>
      <tr>
        <th>Octal
        <td><data><t:text value="sprintf '%o', $value"></>
      <tr>
        <th>Binary
        <td><a pl:href="sprintf '/number/0b%b', $value" rel=bookmark><data><t:text value="sprintf '%b', $value"></></a>
    <tbody>
      <tr>
        <th>Is integer?
        <td><m:boolean m:value=$is_integer />
  </table>

  <table>
    <tbody>
      <tr>
        <th>Integer
        <td><m:number m:value="int $value"/>
  </table>

  <table>
    <caption>Links</caption>
    <tbody>
      <t:if x=$is_integer>
        <tr>
          <th>Previous integer
          <td><m:number m:value="$value-1"/>
        <tr>
          <th>Next integer
          <td><m:number m:value="$value+1"/>
      </t:if>
  </table>

  <table>
    <caption>Cast</caption>
    <tbody>
      <t:if x="$is_integer and 0 <= $value and $value <= 0x7FFFFFFF">
        <tr>
          <th>Code point
          <td><m:codepoint m:value="$value"/>
      </t:if>
  </table>
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
