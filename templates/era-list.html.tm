<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Eras
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1>Eras</h1>
  </>
  </header>

  <nav class=content-links>
    <menu class=nearby><a href="https://wiki.suikawiki.org/n/紀年法">Notes</a></menu>
  </nav>

  <menu class=toc />

  <page-main>
  
  <section id=list>
    <h1>List of eras</h1>

    <ul class=item-list>
      <t:for as=$key x="[sort { $a cmp $b } keys %{$SWD::Eras::Defs->{eras}}]">
        <li><m:era m:key=$key />
      </t:for>
    </ul>
  </section>

  <section id=links>
    <h1>Link</h1>

    <ul>
      <li><a href=/era/system>List of era systems</a>
    </ul>
  </section>

  <p>Extracted from
  <a href=https://github.com/manakai/data-locale/blob/master/data/calendar/era-defs.json>a
  JSON data file</a>
  (<a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-era-defs.txt>documentation</a>).

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
