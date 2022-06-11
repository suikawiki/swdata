<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Gregorian yearless dates
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1>Gregorian yearless dates</>
  </>
  </header>

  <nav class=content-links>
  <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/yearless%20date'">Notes</a></menu>
  </nav>
  
  <menu class=toc />

  <page-main>
  <t:for as=$m x="[1..12]">
    <section pl:id="'month-' . $m">
      <h1>Month <t:text value=$m></h1>
      <ul class="item-list">
        <t:for as=$d x="[1..[undef, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]->[$m]]">
          <li><m:yearless-date-md m:month=$m m:day=$d />
        </t:for>
      </ul>
    </section>
  </t:for>
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
