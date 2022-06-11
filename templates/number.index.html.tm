<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Numbers
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1>Numbers</h1>
  </hgroup>
  </header>

  <page-main>
  
  <form action=javascript: onsubmit="
    location.href = '/number/' + elements.number.value;
    return false;
  " class=input>
    <input type=number name=number step=any value=0 required>
    <button type=submit>Decimal</button>
  </form>

  <form action=javascript: onsubmit="
    location.href = '/number/0x' + encodeURIComponent (elements.number.value);
    return false;
  " class=input>
    <input name=number pattern=[0-9A-Fa-f]+ value=0 required>
    <button type=submit>Hexadecimal</button>
  </form>

  <form action=javascript: onsubmit="
    location.href = '/number/0b' + encodeURIComponent (elements.number.value);
    return false;
  " class=input>
    <input name=number pattern=[01]+ value=0 required>
    <button type=submit>Binary</button>
  </form>

  <form action=javascript: onsubmit="
    location.href = '/number/cjk:' + encodeURIComponent (elements.number.value);
    return false;
  " class=input>
    <input name=number value=〇 required>
    <button type=submit>CJK number</button>
  </form>

  </page-main>
  <page-side>
    <m:ads />
  </page-side>
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015-2019 Wakaba <wakaba@suikawiki.org>.

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
