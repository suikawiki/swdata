<html t:params="$app $tzvalue" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<t:my as=$serialized x="$tzvalue->to_string">
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>
      <t:text value=$serialized> (time zone offset)
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

  <section id=comparison>
    <h1>Comparison</h1>

    <t:my as=$tzoffsets x="[map { TZOffset->parse ($_) || TZOffset->new_from_seconds (0) } @{$app->bare_param_list ('compare')}]">
    <table class=nv>
      <tbody>
        <t:for as=$tzoffset x=$tzoffsets>
          <tr>
            <th t:space=preserve>
              <m:tzoffset m:tzvalue="$tzoffset"/>
            <td>
              <t:text value="
                my $delta = TZOffset->new_from_seconds
                    ($tzoffset->seconds - $tzvalue->seconds);
                $delta->to_string;
              ">
        </t:for>
      <tfoot>
        <tr>
          <t:for as=$tzoffset x=$tzoffsets>
            <input type=hidden name=compare pl:value="$tzoffset->to_string" form=compare-form>
          </t:for>
          <t:for as=$time x="$app->bare_param_list ('time')">
            <input type=hidden name=time pl:value=$time form=compare-form>
          </t:for>
          <td colspan=2>
            <form method=get id=compare-form action=#comparison>
              <input name=compare>
              <button type=submit>Compare</button>
            </form>
    </table>

    <table>
      <t:my as=$tzs x="
        my @list;
        push @list, Web::DateTime::TimeZone->new_from_offset ($tzvalue->seconds);
        push @list, map {
          Web::DateTime::TimeZone->new_from_offset ($_->seconds);
        } @$tzoffsets;
        push @list, Web::DateTime::TimeZone->new_from_offset (0);
        \@list;
      ">
      <thead>
        <tr>
          <th><m:tzoffset m:tzvalue="$tzvalue"/></th>
          <t:for as=$tzoffset x=$tzoffsets>
            <th><m:tzoffset m:tzvalue="$tzoffset"/>
          </t:for>
          <th>UTC
        <tbody>
          <t:for as=$date x="
            my @d;
            push @d, map {
              Web::DateTime->new_from_unix_time ($_ + 12*3600 - $tzvalue->seconds);
            }
            -24  *3600,
            -12  *3600,
            -10  *3600,
             -9  *3600,
             -1  *3600,
             -0.5*3600,
              0  *3600,
              0.5*3600,
              1  *3600,
              9  *3600,
             10  *3600,
             12  *3600,
             24  *3600,
            ;
            push @d, map {
              my $d = Web::DateTime::Parser->new->parse_time_string ($_);
              $d = Web::DateTime->new_from_unix_time
                  ((defined $d ? $d->to_unix_number : 0) - $tzvalue->seconds);
              $d;
            } @{$app->bare_param_list ('time')};
            \@d;
          ">
            <tr>
              <t:for as=$tz x=$tzs>
                <td><t:text value="
                  $date->set_time_zone ($tz);
                  sprintf '%02d:%02d:%02d', $date->hour, $date->minute, $date->second;
                ">
                <t:if x="not ($date->day == 1 and $date->month == 1 and $date->year == 1970)" t:space=preserve>
                  (Δday = <t:text value="
                    my $d = Web::DateTime->new_from_components
                        ($date->year, $date->month, $date->day);
                    Number->new_from_perl ($d->to_jd - 2440587.5)->floor->to_perl;
                  ">)
                </t:if>
              </t:for>
          </t:for>
        <tfoot>
          <tr>
            <t:for as=$tzoffset x=$tzoffsets>
              <input type=hidden name=compare pl:value="$tzoffset->to_string" form=compare-time-form>
            </t:for>
            <t:for as=$time x="$app->bare_param_list ('time')">
              <input type=hidden name=time pl:value=$time form=compare-time-form>
            </t:for>
            <td><input type=time name=time form=compare-time-form step=1>
            <td pl:colspan="@$tzoffsets + 1">
              <form method=get id=compare-time-form action=#comparison>
                <button type=submit>Compare</button>
              </form>
    </table>

    <hr>

    <p t:space=preserve>If
    <time>12:00</time> <m:tzoffset m:tzvalue=$tzvalue /> is
    <var>hour</var>, <var>hour</var>'s <var>offset</var> is...

    <table class=nv>
      <thead>
        <tr>
          <th><var>hour</var>
          <th colspan=2><var>offset</var>
      <tbody>
        <t:for as=$time x="
          [map {
            my $d = Web::DateTime::Parser->new->parse_time_string ($_);
            $d = Web::DateTime->new_from_unix_time
                (defined $d ? $d->to_unix_number : 0);
            $d;
          } '12:00', @{$app->bare_param_list ('time')}];
        ">
          <tr>
            <td><t:text value="
              sprintf '%02d:%02d:%02d', $time->hour, $time->minute, $time->second;
            ">
            <td><m:tzoffset m:tzvalue="
              TZOffset->new_from_seconds ($time->to_unix_number - 12*60*60 + $tzvalue->seconds);
            "/>
        </t:for>
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
