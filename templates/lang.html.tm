<html t:params="$app $tag" lang=en>
<t:call x="use Web::LangTag">
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$tag"> (Language tag)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />
  <t:my as=$is_valid x=0>

  <header class=page>
  <hgroup>
    <h1><code><t:text value="$tag"></></h1>
    <h2>Language tag</h2>
  </>
  </header>

  <menu class=toc />

  <page-main>

  <form method=get action=/lang class=input>
    <input name=tag pl:value=$tag>
    <button type=submit>Go</button>
  </form>

  <t:my as=$versions x="[
    {name => 'rfc5646', label => 'RFC 5646', parsible => 1, validity => 1},
    {name => 'rfc4646', label => 'RFC 4646', parsible => 1, validity => 1},
    {name => 'rfc3066', label => 'RFC 3066'},
    {name => 'rfc1766', label => 'RFC 1766'},
  ]">

  <section id=ids>
    <h1>Identifiers</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Input
          <td><m:lang m:value="$tag"/>
        <tr>
          <th>Normalized
          <td><m:lang m:value="Web::LangTag->new->normalize_tag ($tag)"/>
        <tr>
          <th>Canonicalized
          <td><m:lang m:value="Web::LangTag->new->canonicalize_tag ($tag)"/>
        <tr>
          <th>Extlang form
          <td><m:lang m:value="Web::LangTag->new->to_extlang_form_tag ($tag)"/>
    </table>
  </section>

  <section id=parsing>
    <h1>Components</h1>

    <table>
      <thead>
        <tr>
          <th/>
          <t:for as=$version x=$versions>
            <th><a pl:href="'https://tools.ietf.org/html/' . $version->{name}"><t:text value="$version->{label}"></a>
          </t:for>
      <tbody>
      <t:my as=$data x="
        my $data = {};
        for my $version (@$versions) {
          my $result;
          my $lt = Web::LangTag->new;
          $result->{errors} = my $errors = [];
          $lt->onerror (sub {
            push @$errors, {@_};
          });

          if ($version->{parsible}) {
            my $method = 'parse_' . $version->{name} . '_tag';
            $result->{parsed} = my $parsed = $lt->$method ($tag);
            $method = 'check_' . $version->{name} . '_parsed_tag';
            $result->{result} = $lt->$method ($parsed);
          } else {
            my $method = 'check_' . $version->{name} . '_tag';
            $result->{result} = $lt->$method ($tag);
          }

          $data->{$version->{name}} = $result;
        }
        $is_valid = $data->{$versions->[0]->{name}}->{result}->{valid};
        $data;
      ">

        <tr>
          <th>Language subtag</>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{language}">
              <t:if x="defined $value">
                <code><t:text value=$value></code>
              </>
          </t:for>
        <tr>
          <th>Extlang subtags</th>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{extlang}">
              <t:for as=$value x=$value>
                <code><t:text value=$value></code>
              <t:sep>
                <t:text value="', '">
              </t:for>
          </t:for>
        <tr>
          <th>Script subtag</>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{script}">
              <t:if x="defined $value">
                <code><t:text value=$value></code>
              </>
          </t:for>
        <tr>
          <th>Region subtag</>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{region}">
              <t:if x="defined $value">
                <code><t:text value=$value></code>
              </>
          </t:for>
        <tr>
          <th>Variant subtags</th>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{variant}">
              <t:for as=$value x=$value>
                <code><t:text value=$value></code>
              <t:sep>
                <t:text value="', '">
              </t:for>
          </t:for>
        <tr>
          <th>Privateuse subtags</th>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{privateuse}">
              <t:for as=$value x=$value>
                <code><t:text value=$value></code>
              <t:sep>
                <t:text value="', '">
              </t:for>
          </t:for>
        <tr class=extlang>
          <th>Extension <code>u</code></th>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{u}">
              <t:for as=$value x=$value>
                <p>
                  <t:for as=$value x=$value>
                    <code><t:text value=$value></code>
                  <t:sep>
                    <t:text value="', '">
                  </t:for>
              </t:for>
          </t:for>
        <tr class=extlang>
          <th>Extension <code>t</code></th>
          <t:for as=$version x=$versions>
            <td>
              <t:my as=$value x="$data->{$version->{name}}->{parsed}->{t}">
              <t:for as=$value x=$value>
                <p>
                  <t:for as=$value x=$value>
                    <code><t:text value=$value></code>
                  <t:sep>
                    <t:text value="', '">
                  </t:for>
              </t:for>
          </t:for>

        <tr class=test-result>
          <th>Well-formed</>
          <t:for as=$version x=$versions>
            <td>
              <t:if x="$version->{validity}">
                <m:boolean m:value="$data->{$version->{name}}->{result}->{well_formed}"/>
              </t:if>
          </t:for>
        <tr class=test-result>
          <th>Valid</>
          <t:for as=$version x=$versions>
            <td>
              <t:if x="$version->{validity}">
                <m:boolean m:value="$data->{$version->{name}}->{result}->{valid}"/>
              </t:if>
          </t:for>
        <tr>
          <th>Errors</th>
          <t:for as=$version x=$versions>
            <td class=long>
              <t:if x="0+@{$data->{$version->{name}}->{errors}}">
                <ul class=error-list>
                  <t:for as=$error x="$data->{$version->{name}}->{errors}">
                    <li pl:data-level="$error->{level}">
                      <t:if x="$error->{level} eq 'm'">
                        <strong><em class=rfc2119>MUST</em>-level error</>:
                      <t:elsif x="$error->{level} eq 's'">
                        <strong><em class=rfc2119>SHOULD</em>-level error</>:
                      <t:elsif x="$error->{level} eq 'w'">
                        <strong>Warning</strong>:
                      <t:elsif x="$error->{level} eq 'i'">
                        <strong>Information</strong>:
                      </t:if>

                      <t:if x="defined $error->{value}">
                        Value <code><t:text value="$error->{value}"></code>:
                      </t:if>
                      <data><t:text value="$error->{type}"></data>
                      <t:if x="defined $error->{text}">
                        (<data><t:text value="$error->{text}"></data>)
                      </t:if>
                  </t:for>
                </ul>
              <t:else>
                No error.
              </t:if>
          </t:for>
  </section>

  </page-main>


  <t:if x=$is_valid>
    <page-side>
      <m:ads />
    </page-side>
  </>
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
