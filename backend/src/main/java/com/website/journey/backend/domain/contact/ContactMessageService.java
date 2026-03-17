package com.website.journey.backend.domain.contact;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ContactMessageService {

    private final ContactMessageRepository contactMessageRepository;

    public ContactMessageService(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    @Transactional
    public void submit(ContactFormRequest request) {
        ContactMessage message = ContactMessage.builder()
                .name(request.name())
                .email(request.email())
                .message(request.message())
                .read(false)
                .build();
        contactMessageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public Page<ContactMessageDto> getAll(Pageable pageable) {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toDto);
    }

    @Transactional
    public ContactMessageDto markRead(Long id) {
        ContactMessage message = contactMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Contact message not found: " + id));
        message.setRead(true);
        return toDto(contactMessageRepository.save(message));
    }

    @Transactional
    public void delete(Long id) {
        ContactMessage message = contactMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Contact message not found: " + id));
        contactMessageRepository.delete(message);
    }

    private ContactMessageDto toDto(ContactMessage message) {
        return new ContactMessageDto(
                message.getId(),
                message.getName(),
                message.getEmail(),
                message.getMessage(),
                message.isRead(),
                message.getCreatedAt()
        );
    }
}
