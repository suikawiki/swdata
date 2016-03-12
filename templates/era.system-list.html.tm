<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Era systems
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1>Era systems</h1>
  </>

  <menu class=nearby><a href="https://wiki.suikawiki.org/n/元号">Notes</a></menu>

  <menu class=toc />

  <section id=list>
    <h1>List of era systems</h1>

    <ul class=era-list>
      <t:for as=$key x="[sort { $a cmp $b } keys %{$SWD::Eras::Systems->{systems}}]">
        <li><m:era-system m:key=$key />
      </t:for>
    </ul>
  </section>

  <p>Extracted from
  <a href=https://github.com/manakai/data-locale/blob/master/data/calendar/era-systems.json>a
  JSON data file</a>
  (<a href=https://github.com/manakai/data-locale/blob/master/doc/calendar-era-systems.txt>documentation</a>).

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016 Wakaba <wakaba@suikawiki.org>.

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
