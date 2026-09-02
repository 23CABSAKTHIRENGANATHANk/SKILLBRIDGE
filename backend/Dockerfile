# ========================================================================
# SkillBridge Enterprise Backend Dockerfile for Render Deployment
# Base: PHP 8.2 with Apache & PostgreSQL (pdo_pgsql) Support
# ========================================================================

FROM php:8.2-apache

# Install required system packages and PostgreSQL client libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    ca-certificates \
    && docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules for routing and security headers
RUN a2enmod rewrite headers

# Configure PHP production defaults
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=4000'; \
    echo 'opcache.revalidate_freq=2'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'upload_max_filesize=10M'; \
    echo 'post_max_size=12M'; \
    echo 'memory_limit=256M'; \
    echo 'display_errors=Off'; \
    echo 'log_errors=On'; \
} > /usr/local/etc/php/conf.d/production.ini

# Set Apache Document Root to /var/www/html
ENV APACHE_DOCUMENT_ROOT /var/www/html
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Allow .htaccess overrides
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Copy backend source code
WORKDIR /var/www/html
COPY . /var/www/html/

# Create required writable directories and set permissions
RUN mkdir -p /var/www/html/storage/logs \
             /var/www/html/storage/resumes \
             /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/uploads \
    && chmod -R 775 /var/www/html/storage /var/www/html/uploads

# Configure container port (Render default is 10000 or custom via PORT env)
ENV PORT 80
EXPOSE 80

# Start Apache in foreground
CMD ["apache2-foreground"]
