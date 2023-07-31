package SWD::Web;
use strict;
use warnings;
use Path::Tiny;
use POSIX qw(floor);
use Time::HiRes qw(time);
use Promise;
use Promised::File;
use Web::DateTime;
use Web::DateTime::TimeZone;
use Web::DateTime::Parser;
use Web::URL::Encoding;
use Kyuureki qw(kyuureki_to_gregorian);
use Number::CJK::Parser;
use JSON::PS;
use Wanage::HTTP;
use Warabe::App;
use Temma;
use SWD::Eras;
use SWD::Kanshi;
use Number;
use Longitude;
use TZOffset;

sub psgi_app ($) {
  my ($class) = @_;

  return sub {
    my $http = Wanage::HTTP->new_from_psgi_env ($_[0]);
    my $app = Warabe::App->new_from_http ($http);

    $http->set_response_header
        ('Strict-Transport-Security' => 'max-age=10886400; includeSubDomains; preload');

    return $app->execute_by_promise (sub {
      return $class->main ($app);
    });
  };
} # psgi_app

use Path::Class; # XXX
my $TemplatesD = file (__FILE__)->dir->parent->parent->subdir ('templates');
sub temma ($$$) {
  my ($app, $template_path, $args) = @_;
  my $http = $app->http;
  $http->response_mime_type->set_value ('text/html');
  $http->response_mime_type->set_param (charset => 'utf-8');
  my $fh = SWD::Web::Temma::Printer->new_from_http ($http);
  $args->{app} = $app;
  return Promise->new (sub {
    my $ok = $_[0];
    Temma->process_html
        ($TemplatesD->file (@$template_path), $args => $fh,
         sub { undef $fh; $http->close_response_body; $ok->() });
  });
} # temma

my $RootPath = path (__FILE__)->parent->parent->parent;

sub static ($$$;%) {
  my ($app, $type, $name, %args) = @_;
  $app->http->set_response_header ('Content-Type' => $type);
  $app->http->set_response_header ('Content-Encoding' => 'gzip') if $args{gzip};
  my $file = Promised::File->new_from_path ($RootPath->child ($name));
  return $file->stat->then (sub {
    $app->http->set_response_last_modified ($_[0]->mtime);
    return $file->read_byte_string;
  }, sub {
    return $app->throw_error (404);
  })->then (sub {
    $app->http->send_response_body_as_ref (\($_[0]));
    $app->http->close_response_body;
  });
} # static

my $SWWPages = json_bytes2perl $RootPath->child ('local/data/sww-pages.json')->slurp;

sub main ($$$) {
  my ($class, $app) = @_;
  my $path = $app->path_segments;

  if (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'common.css') {
    # /css/common.css
    return static $app, 'text/css; charset=utf-8', 'css/common.css';
  } elsif (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'default.css') {
    # /css/default.css
    return static $app, 'text/css; charset=utf-8', 'css/default.css';
  }

  if (@$path == 2 and $path->[0] eq 'js' and
      $path->[1] =~ /\A[a-z0-9]+\.js\z/) {
    # /js/{name}.js
    return static $app, 'text/javascript; charset=utf-8', 'js/' . $path->[1];
  }

  if (@$path == 2 and $path->[0] eq 'number') {
    if ($path->[1] eq '') {
      # /number/
      return temma $app, ['number.index.html.tm'], {};
    } elsif ($path->[1] =~ /\A[+-]?[0-9]+\z/) {
      # /number/{sign}{integer}
      my $v = $path->[1] eq '-0' ? (1/"-inf") : 0+$path->[1];
      return temma $app, ['number.html.tm'], {
        value => $v,
        nvalue => Number->new_from_perl ($v),
      };
    } elsif ($path->[1] =~ /\A0x[0-9A-Fa-f]+\z/) {
      # /number/0x{hex}
      return temma $app, ['number.html.tm'], {
        value => hex $path->[1],
        nvalue => Number->new_from_perl (hex $path->[1]),
      };
    } elsif ($path->[1] =~ /\A0b[01]+\z/) {
      # /number/0b{binary}
      return temma $app, ['number.html.tm'], {
        value => eval $path->[1],
        nvalue => Number->new_from_perl (eval $path->[1]),
      };
    } elsif ($path->[1] =~ /\A[+-]?[0-9]+\.[0-9]+\z/) {
      # /number/{sign}{integer}.{integer}
      return temma $app, ['number.html.tm'], {
        value => 0+$path->[1],
        nvalue => Number->new_from_perl (0+$path->[1]),
      };
    } elsif ($path->[1] =~ s/\Acjk://) {
      # /number/cjk:{number}
      my $number = parse_cjk_number $path->[1];
      return temma $app, ['number.html.tm'], {
        value => $number,
        nvalue => Number->new_from_perl ($number),
      } if defined $number;
    }
  }

  if (@$path == 2 and $path->[0] eq 'boolean') {
    if ($path->[1] eq 'true' or $path->[1] eq 'false') {
      # /boolean/true
      # /boolean/false
      return temma $app, ['boolean.html.tm'], {value => $path->[1] eq 'true'};
    }
  }

  if (@$path == 2 and
      ($path->[0] eq 'lat' or
       $path->[0] eq 'lon' or
       $path->[0] eq 'latlon')) {
    use utf8;
    my @value = map {
      s/\s+//g;
      if (/\A[+-]?[0-9]+(?:\.[0-9]+|)\z/) {
        0+$_;
      } elsif (/\A([0-9]+)(?:[.°]([0-9]+)(?:[.'′]([0-9]+(?:\.[0-9]+|))(?:''|″|)|)|)([NnSsEeWw])\z/) {
        (($4 eq 'S' or $4 eq 's' or $4 eq 'W' or $4 eq 'w') ? -1 : +1) *
         ($1 +
          ($2 || 0) / 60 +
          ($3 || 0) / 3600);
      } else {
        undef;
      }
    } split /,/, $path->[1], -1;

    if (@value == 1 and defined $value[0] and $path->[0] eq 'lat') {
      return temma $app, ['lat.html.tm'], {value => $value[0]}
          if -90 <= $value[0] and $value[0] <= +90;
    }

    if (@value == 1 and defined $value[0] and $path->[0] eq 'lon') {
      my $n = Number->new_from_perl ($value[0]);
      my $lon = Longitude->new_from_number ($n);
      return temma $app, ['lon.html.tm'], {
        value => $value[0],
        lonvalue => $lon,
      };
    }

    if (@value == 2 and defined $value[0] and defined $value[1] and
        $path->[0] eq 'latlon') {
      return temma $app, ['latlon.html.tm'], {lat => $value[0], lon => $value[1]}
          if -90 <= $value[0] and $value[0] <= +90;
    }
  }

  if (@$path == 2 and $path->[0] eq 'tzoffset') {
    # /tzoffset/{offset}
    my $tz = TZOffset->parse ($path->[1]);
    return temma $app, ['tzoffset.html.tm'], {tzvalue => $tz} if defined $tz;
  } elsif (@$path == 1 and $path->[0] eq 'tzoffset') {
    # /tzoffset
    return temma $app, ['tzoffset-list.html.tm'], {};
  }

  if (@$path == 2 and $path->[0] eq 'datetime' and $path->[1] eq '--mm-dd') {
    # /datetime/--mm-dd
    return temma $app, ['yearless-date-list.html.tm'], {};
  }

  {
    my $dt;
    if (@$path == 2 and $path->[0] eq 'datetime') {
      # /datetime/{...}
      if ($path->[1] =~ /\A[+-]?[0-9]+(?:\.[0-9]+|)\z/) {
        $dt = Web::DateTime->new_from_unix_time ($path->[1]);
      } elsif ($path->[1] =~ /\Akyuureki:([0-9]+)-([0-9]+)('?)-([0-9]+)\z/) {
        my $parser = Web::DateTime::Parser->new;
        my $d = [kyuureki_to_gregorian $1, $2, $3, $4];
        $dt = $parser->parse_date_string
            (sprintf '%04d-%02d-%02d', $d->[0], $d->[1], $d->[2])
                if defined $d->[0];
      } elsif ($path->[1] eq 'now' or $path->[1] eq '') {
        $dt = Web::DateTime->new_from_unix_time (time);
      } elsif ($path->[1] =~ /\Ayear:([+-]?[0-9]+)\z/) {
        my $parser = Web::DateTime::Parser->new;
        $dt = $parser->parse_manakai_year_string ($1);
      } elsif ($path->[1] =~ /\Ajd:([+-]?[0-9]+(?:\.[0-9]+|))\z/) {
        $dt = Web::DateTime->new_from_jd ($1);
      } elsif ($path->[1] =~ /\Amjd:([+-]?[0-9]+(?:\.[0-9]+|))\z/) {
        $dt = Web::DateTime->new_from_mjd ($1);
      } elsif ($path->[1] =~ /\Ajulian:(.+)\z/) {
        my $parser = Web::DateTime::Parser->new;
        $dt = $parser->parse_julian_ymd_string ($1);
      } elsif ($path->[1] =~ /\A([+-]?[0-9]+-[0-9]+-[0-9]+)\z/) {
        my $parser = Web::DateTime::Parser->new;
        $dt = $parser->parse_ymd_string ($1);
      } else {
        $path->[1] =~ s/\s+([+-][0-9]{2}:[0-9]{2})$/$1/;
        my $parser = Web::DateTime::Parser->new;
        $dt = $parser->parse_html_datetime_value ($path->[1]);
      }
    }

    if (@$path == 2 and $path->[0] eq 'year') {
      # /year/{year}
      my $parser = Web::DateTime::Parser->new;
      $dt = $parser->parse_manakai_year_string ($path->[1]);
    }

    if (@$path == 2 and $path->[0] eq 'spots') {
      # //WORLD/spots/{spot_id}
      my $mapped = $SWWPages->{$path->[1]};
      if (defined $mapped) {
        return $app->throw_redirect ('https://wiki.suikawiki.org/n/' . $mapped);
      }

      if ($path->[1] eq 'search') {
        # //WORLD/spots/search?q={text}
        return $app->throw_redirect ('https://wiki.suikawiki.org/n/Wiki%2F%2FSearch?q=' . percent_encode_c ($app->text_param ('q') // ''));
      }
    }

    if ($path->[0] eq 'y' or
        $path->[0] eq 'e' or
        $path->[0] eq 'tag' or
        $path->[0] eq 'spots' or
        $path->[0] eq 'world' or
        $path->[0] eq 'antenna' or
        $path->[0] eq 'chars' or
        $path->[0] eq 'char' or
        $path->[0] eq 'string' or
        $path->[0] eq '' or
        $path->[0] eq 'web' or
        $path->[0] eq 'radio' or
        $path->[0] eq 'houses' or
        $path->[0] eq 'about' or
        $path->[0] eq 'license') {
      # /e/...
      # /y/...
      # /tag/...
      # /spots/...
      # /world
      # /chars
      # /char
      # /string
      # /antenna
      # /radio
      # /web
      # /houses
      # /about
      # /license
      return static $app, 'text/html; charset=utf-8', 'html/year.html';
    }

    if (defined $dt and $dt->is_date_time) {
      if ($dt->has_component ('year') and
          not $dt->has_component ('month')) {
        return temma $app, ['year.html.tm'], {value => $dt};
      } elsif (not $dt->has_component ('year') and
               $dt->has_component ('month') and
               $dt->has_component ('day')) {
        return temma $app, ['yearless-date.html.tm'], {value => $dt};
      } else {
        return temma $app, ['datetime.html.tm'], {value => $dt};
      }
    }
  }

  if (@$path == 1 and $path->[0] eq 'year') {
    # /year
    return temma $app, ['year-list.html.tm'], {};
  }

  if (@$path == 3 and $path->[0] eq 'era' and $path->[1] eq 'system') {
    # /era/system/{key}
    my $def = $SWD::Eras::Systems->{systems}->{$path->[2]};
    return $app->throw_error (404) unless defined $def;
    return temma $app, ['era.system.html.tm'], {system => $def, key => $path->[2]};
  } elsif (@$path == 2 and $path->[0] eq 'era' and $path->[1] eq 'system') {
    # /era/system
    return temma $app, ['era.system-list.html.tm'], {};
  }

  if (@$path == 2 and $path->[0] eq 'era') {
    # /era/{string}
    my $def = SWD::Eras::get_era_by_string ($path->[1]);
    return $app->throw_error (404) unless defined $def;
    return temma $app, ['era.html.tm'], {era => $def};
  } elsif (@$path == 1 and $path->[0] eq 'era') {
    # /era
    return temma $app, ['era-list.html.tm'], {};
  }

  if (@$path == 2 and $path->[0] eq 'kanshi') {
    # /kanshi/{value}
    my $def = $SWD::Kanshi::ValueToDef->{$path->[1]};
    return $app->throw_error (404) unless defined $def;
    return temma $app, ['kanshi.html.tm'], {def => $def};
  } elsif (@$path == 1 and $path->[0] eq 'kanshi') {
    # /kanshi
    return temma $app, ['kanshi-list.html.tm'], {};
  }

  if ((@$path == 2 and $path->[0] eq 'lang') or
      (@$path == 1 and $path->[0] eq 'lang')) {
    # /lang/{langtag}
    # /lang?tag={langtag}
    my $tag = $path->[1] // $app->text_param ('tag') // '';
    return temma $app, ['lang.html.tm'], {tag => $tag};
  }

  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'charrels' and
      $path->[2] =~ m{\A[a-z0-9]+\z} and
      $path->[3] =~ m{\A[0-9A-Za-z_-]+\.json\z}) {
    # /data/charrels/{}/{}.json
    return static $app, 'application/json; charset=utf-8',
        "local/$path->[1]/$path->[2]/$path->[3].gz",
        gzip => 1;
  }
  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'charrels' and
      $path->[2] =~ m{\A[a-z0-9]+\z} and
      $path->[3] =~ m{\A[0-9A-Za-z_-]+\.dat\z}) {
    # /data/charrels/{}/{}.dat
    return static $app, 'application/octet-stream',
        "local/$path->[1]/$path->[2]/$path->[3].gz",
        gzip => 1;
  } elsif (@$path == 5 and
           $path->[0] eq 'data' and
           $path->[1] eq 'charrels' and
           $path->[2] =~ m{\A[a-z0-9]+\z} and
           $path->[3] =~ m{\A[a-z0-9][a-z0-9-]+\z} and
           $path->[4] =~ m{\A[a-z0-9][0-9A-Za-z_-]*\.[0-9a-z]+\z}) {
    # /data/charrels/{}/{}/{}.{}
    return static $app, 'application/octet-stream',
        "local/$path->[1]/$path->[2]/$path->[3]/$path->[4]";
  } elsif (@$path == 4 and
           $path->[0] eq 'data' and
           $path->[1] eq 'opentype' and
           $path->[2] =~ m{\A[a-z0-9][0-9A-Za-z_-]*\z} and
           $path->[3] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*\.([0-9a-z]+)\z}) {
    # /data/opentype/{}/{}
    my $mime = {
      css => 'text/css;charset=utf-8',
    }->{$1} // 'application/octet-stream';
    return static $app, $mime,
        "local/fonts/opentype/$path->[2]/$path->[3]";
  }
  
  if (@$path == 2 and
      $path->[0] eq 'data' and
      $path->[1] eq 'fonts.json') {
    # /data/fonts.json
    return static $app, 'application/json; charset=utf-8', 'fonts/list.json';
  }
  
  if (@$path == 2 and
      $path->[0] eq 'data' and
      $path->[1] =~ m{\A[0-9A-Za-z_-]+\.json\z}) {
    # /data/{}.json
    return static $app, 'application/json; charset=utf-8', 'local/data/'.$path->[1];
  }
  
  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'antenna' and
      $path->[2] =~ m{\A[0-9A-Za-z_-]+\z} and
      $path->[3] =~ m{\A[0-9]{4}-[0-9]{2}\.json\z}) {
    # /data/antenna/{}/{}.json
    return static $app, 'application/json; charset=utf-8', 'local/aggregated/'.$path->[2] . '/' . $path->[3];
  } elsif (@$path == 4 and
           $path->[0] eq 'data' and
           $path->[1] eq 'antenna' and
           $path->[2] eq 'radio' and
           $path->[3] eq 'programs.json') {
    # /data/antenna/radio/programs.json
    return static $app, 'application/json; charset=utf-8', 'local/aggregated/'.$path->[2] . '/' . $path->[3];
  }

  if (@$path == 2 and
      $path->[0] eq 'fonts' and
      $path->[1] =~ m{\A[0-9A-Za-z_-]+\.ttf\z}) {
    # /fonts/{}.ttf
    return static $app, 'font/ttf', 'fonts/'.$path->[1];
  }
  
  if (@$path == 1 and $path->[0] eq 'robots.txt') {
    # /robots.txt
    return $app->send_plain_text ('');
  }

  if (@$path == 1 and $path->[0] eq 'favicon.ico') {
    # /favicon.ico
    return $app->send_redirect ('https://wiki.suikawiki.org/favicon.ico');
  }

  return $app->send_error (404);
} # main

package SWD::Web::Temma::Printer;

sub new_from_http ($$) {
  return bless {http => $_[1], value => ''}, $_[0];
} # new_from_http

sub print ($$) {
  $_[0]->{value} .= $_[1];
  if (length $_[0]->{value} > 1024*10 or length $_[1] == 0) {
    $_[0]->{http}->send_response_body_as_text ($_[0]->{value});
    $_[0]->{value} = '';
  }
} # print

sub DESTROY {
  $_[0]->{http}->send_response_body_as_text ($_[0]->{value})
      if length $_[0]->{value};
} # DESTROY

1;

=head1 LICENSE

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

=cut
