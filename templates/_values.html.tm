<t:macro name=boolean t:params=$value>
  <t:if x=$value>
    <a href=/boolean/true><data>true</></a>
  <t:else>
    <a href=/boolean/false><data>false</></a>
  </t:if>
</t:macro>

<t:macro name=number t:params=$value>
  <a pl:href="'/number/' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=lat t:params=$value>
  <a pl:href="'/lat/' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=lon t:params=$value>
  <a pl:href="'/lon/' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=codepoint t:params=$value>
  <a pl:href="sprintf '//chars.suikawiki.org/char/%04X', $value"><data><t:text value="$value <= 0x10FFFF ? sprintf 'U+%04X', $value : sprintf 'U-%08X', $value"></data></a>
</t:macro>

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
