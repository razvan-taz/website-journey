package com.website.journey.backend.domain.faq;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class FaqItemService {

    private final FaqItemRepository faqItemRepository;

    public FaqItemService(FaqItemRepository faqItemRepository) {
        this.faqItemRepository = faqItemRepository;
    }

    @Transactional(readOnly = true)
    public List<FaqItemDto> getAll() {
        return faqItemRepository.findAllByOrderByPositionAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public FaqItemDto create(CreateFaqRequest req) {
        List<FaqItem> existing = faqItemRepository.findAllByOrderByPositionAsc();
        int nextPosition = existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getPosition() + 1;

        FaqItem item = FaqItem.builder()
                .question(req.question())
                .answer(req.answer())
                .position(nextPosition)
                .build();

        return toDto(faqItemRepository.save(item));
    }

    @Transactional
    public FaqItemDto update(Long id, CreateFaqRequest req) {
        FaqItem item = faqItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "FAQ item not found: " + id));

        item.setQuestion(req.question());
        item.setAnswer(req.answer());

        return toDto(faqItemRepository.save(item));
    }

    @Transactional
    public void delete(Long id) {
        FaqItem item = faqItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "FAQ item not found: " + id));

        faqItemRepository.delete(item);

        // Rebalance positions: renumber remaining items 0, 1, 2, ...
        List<FaqItem> remaining = faqItemRepository.findAllByOrderByPositionAsc();
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i);
        }
        faqItemRepository.saveAll(remaining);
    }

    @Transactional
    public List<FaqItemDto> moveUp(Long id) {
        List<FaqItem> items = faqItemRepository.findAllByOrderByPositionAsc();
        int index = findIndex(items, id);

        if (index > 0) {
            FaqItem current = items.get(index);
            FaqItem previous = items.get(index - 1);
            int tempPosition = current.getPosition();
            current.setPosition(previous.getPosition());
            previous.setPosition(tempPosition);
            faqItemRepository.saveAll(List.of(current, previous));
        }

        return faqItemRepository.findAllByOrderByPositionAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<FaqItemDto> moveDown(Long id) {
        List<FaqItem> items = faqItemRepository.findAllByOrderByPositionAsc();
        int index = findIndex(items, id);

        if (index < items.size() - 1) {
            FaqItem current = items.get(index);
            FaqItem next = items.get(index + 1);
            int tempPosition = current.getPosition();
            current.setPosition(next.getPosition());
            next.setPosition(tempPosition);
            faqItemRepository.saveAll(List.of(current, next));
        }

        return faqItemRepository.findAllByOrderByPositionAsc().stream()
                .map(this::toDto)
                .toList();
    }

    private int findIndex(List<FaqItem> items, Long id) {
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).getId().equals(id)) {
                return i;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "FAQ item not found: " + id);
    }

    private FaqItemDto toDto(FaqItem item) {
        return new FaqItemDto(
                item.getId(),
                item.getQuestion(),
                item.getAnswer(),
                item.getPosition()
        );
    }
}
