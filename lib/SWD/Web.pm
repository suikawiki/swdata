package SWD::Web;
use strict;
use warnings;
use Path::Tiny;
use POSIX qw(floor);
use Time::HiRes qw(time);
use Promise;
use Promised::File;
use Web::DateTime;
use Web::DateTime::Parser;
use Kyuureki qw(kyuureki_to_gregorian);
use Wanage::HTTP;
use Warabe::App;
use Temma;

sub psgi_app ($) {
  my ($class) = @_;

  return sub {
    ## This is necessary so that different forked siblings have
    ## different seeds.
    srand;

    ## XXX Parallel::Prefork (?)
    delete $SIG{CHLD};
    delete $SIG{CLD};

    my $http = Wanage::HTTP->new_from_psgi_env ($_[0]);
    my $app = Warabe::App->new_from_http ($http);

    # XXX accesslog
    warn sprintf "Access: [%s] %s %s\n",
        scalar gmtime, $app->http->request_method, $app->http->url->stringify;

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

sub static ($$$) {
  my ($app, $type, $name) = @_;
  $app->http->set_response_header ('Content-Type' => $type);
  my $file = Promised::File->new_from_path ($RootPath->child ($name));
  return $file->stat->then (sub {
    $app->http->set_response_last_modified ($_[0]->mtime);
    return $file->read_byte_string;
  })->then (sub {
    $app->http->send_response_body_as_ref (\($_[0]));
    $app->http->close_response_body;
  });
} # static

sub main ($$$) {
  my ($class, $app) = @_;
  my $path = $app->path_segments;

  if (@$path == 1 and $path->[0] eq '') {
    # /
    return temma $app, ['index.html.tm'], {};
  }

  if (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'common.css') {
    # /css/common.css
    return static $app, 'text/css; charset=utf-8', 'css/common.css';
  }

  if (@$path == 2 and $path->[0] eq 'number') {
    if ($path->[1] =~ /\A[+-]?[0-9]+\z/) {
      # /number/{sign}{integer}
      return temma $app, ['number.html.tm'], {value => 0+$path->[1]};
    } elsif ($path->[1] =~ /\A0x[0-9A-Fa-f]+\z/) {
      # /number/0x{hex}
      return temma $app, ['number.html.tm'], {value => hex $path->[1]};
    } elsif ($path->[1] =~ /\A0b[01]+\z/) {
      # /number/0b{binary}
      return temma $app, ['number.html.tm'], {value => eval $path->[1]};
    } elsif ($path->[1] =~ /\A[+-]?[0-9]+\.[0-9]+\z/) {
      # /number/{sign}{integer}.{integer}
      return temma $app, ['number.html.tm'], {value => 0+$path->[1]};
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
      return temma $app, ['lon.html.tm'], {value => $value[0]};
    }

    if (@value == 2 and defined $value[0] and defined $value[1] and
        $path->[0] eq 'latlon') {
      return temma $app, ['latlon.html.tm'], {lat => $value[0], lon => $value[1]}
          if -90 <= $value[0] and $value[0] <= +90;
    }
  }

  if (@$path == 2 and $path->[0] eq 'tzoffset' and
      $path->[1] =~ /\A([+-])([0-9]+):([0-9]+)(?::([0-9]+(?:\.[0-9]+|))|)\z/) {
    # /tzoffset/{offset}
    my $seconds = $2 * 3600 + $3 * 60 + ($4 || 0);
    $seconds *= -1 if $1 eq '-';
    return temma $app, ['tzoffset.html.tm'], {value => $seconds};
  }

  if (@$path == 2 and $path->[0] eq 'datetime') {
    my $dt;
    if ($path->[1] =~ /\A[+-]?[0-9]+(?:\.[0-9]+|)\z/) {
      $dt = Web::DateTime->new_from_unix_time ($path->[1]);
    } elsif ($path->[1] =~ /\Akyuureki:([0-9]+)-([0-9]+)('?)-([0-9]+)\z/) {
      my $parser = Web::DateTime::Parser->new;
      my $d = [kyuureki_to_gregorian $1, $2, $3, $4];
      $dt = $parser->parse_date_string
          (sprintf '%04d-%02d-%02d', $d->[0], $d->[1], $d->[2])
              if defined $d->[0];
    } elsif ($path->[1] eq 'now') {
      $dt = Web::DateTime->new_from_unix_time (time);
    } elsif ($path->[1] =~ /\Ayear:([+-]?[0-9]+)\z/) {
      my $parser = Web::DateTime::Parser->new;
      $dt = $parser->parse_html_datetime_value (sprintf '%04d', $1);
    } elsif ($path->[1] =~ /\Ajd:([+-]?[0-9]+(?:\.[0-9]+|))\z/) {
      $dt = Web::DateTime->new_from_unix_time
          (($1 - 2440587.5) * 24 * 60 * 60);
    } elsif ($path->[1] =~ /\Amjd:([+-]?[0-9]+(?:\.[0-9]+|))\z/) {
      $dt = Web::DateTime->new_from_unix_time
          (($1 + 2400000.5 - 2440587.5) * 24 * 60 * 60);
    } elsif ($path->[1] =~ /\Ajulian:([+-]?[0-9]+)-([0-9]+)-([0-9]+)\z/) {
      my $y = $1 + floor (($2 - 3) / 12);
      my $m = ($2 - 3) % 12;
      my $d = $3 - 1;
      my $n = $d + floor ((153 * $m + 2) / 5) + 365 * $y + floor ($y / 4);
      my $mjd = $n - 678883;
      $dt = Web::DateTime->new_from_unix_time
          (($mjd + 2400000.5 - 2440587.5) * 24 * 60 * 60);
    } else {
      my $parser = Web::DateTime::Parser->new;
      $dt = $parser->parse_html_datetime_value ($path->[1]);
    }
    if (defined $dt and $dt->is_date_time) {
      return temma $app, ['datetime.html.tm'], {value => $dt};
    }
  }

  if (@$path == 1 and $path->[0] eq 'license') {
    # /license
    return temma $app, ['license.html.tm'], {};
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

=cut
